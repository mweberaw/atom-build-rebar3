'use babel';

import fs from 'fs';
import os from 'os';

export function provideBuilder() {
  return class Rebar3BuildProvider {
    constructor(cwd) {
      this.cwd = cwd;
    }

    getNiceName() {
      return 'Rebar3';
    }

    isEligible() {
      return fs.existsSync(`${this.cwd}/rebar.config`);
    }

    settings() {
      const exec = 'rebar3';
      return [ {
        name: 'Rebar3: compile',
        exec: exec,
        args: [ 'compile' ],
        sh: false,
        warningMatch: ['.*_build[\\/\\\\]default[\\/\\\\]lib[\\/\\\\][^\\/\\\\]+[\\/\\\\](?<file>.+):(?<line>\\d+): Warning: (?<message>.+)'],
        errorMatch: [ '.*_build[\\/\\\\]default[\\/\\\\]lib[\\/\\\\][^\\/\\\\]+[\\/\\\\](?<file>.+):(?<line>\\d+):(?! Warning:)\\s+(?<message>.+)' ]
      },
      {
        name: 'Rebar3: eunit',
        exec: exec,
        args: [ 'eunit' ],
        sh: false,
        functionMatch: function(output) {
          const failedRegex = /^\s*(.*)[.]{3}\*failed\*$/;
          const locationRegex = /^in function\s+[^(]+\(.*_build[\/\\]test[\/\\]lib[\/\\][^\/\\]+[\/\\](.+), line (\d+)\)$/;
          const errorStartRegex = /^\*\*error:(.*)$/;
          const errorEndRegex = /^\s*output:/;

          const errors = [];

          var state = 'idle';
          var file = null;
          var lineNo = -1;
          var message = null;
          var description = [];

          output.split(/\r?\n/).forEach(line => {
            switch (state) {
              case 'idle':
                const failed_match = failedRegex.exec(line);
                if (failed_match) {
                  message = failed_match[1] + " failed";
                  state = 'findlocation';
                }
                break;
              case 'findlocation':
                const location_match = locationRegex.exec(line);
                if (location_match) {
                  file = location_match[1];
                  lineNo = location_match[2];
                  state = 'findmessagestart';
                }
                break;
              case 'findmessagestart':
                const error_start_match = errorStartRegex.exec(line);
                if (error_start_match) {
                  description.push(error_start_match[1]);
                  state = 'findmessageend';
                }
                break;
              case 'findmessageend':
                const error_end_match = errorEndRegex.exec(line);
                if (error_end_match) {
                  errors.push({
                    file: file,
                    line: lineNo,
                    type: 'Error',
                    message: message,
                    trace: [
                      {
                        type: 'Trace',
                        message: description.join(os.EOL)
                      }
                    ]
                  });
                  state = 'idle';
                  file = null;
                  lineNo = -1;
                  message = null;
                  description = [];
                } else {
                  description.push(line);
                }
                break;
            }
          });
          return errors;
        }
      },
      {
        name: 'Rebar3:clean',
        exec: exec,
        args: [ 'clean' ],
        sh: false,
        keymap: 'cmd-alt-k'
      },
      {
        name: 'Rebar3: dialyzer',
        exec: exec,
        args: [ 'dialyzer' ],
        env: {
          TERM: "xterm-old" // disable color output
        },
        sh: false,
        functionMatch: function(output) {
          const filePath = /^(?!===>)[^\/\\]*_build[\/\\]default[\/\\]lib[\/\\][^\/\\]+[\/\\](.+)$/;
          const warningLine = /^\s*(\d+):\s*(.+)$/;

          const errors = [];

          var file = null;

          output.split(/\r?\n/).forEach(line => {
            const file_match = filePath.exec(line);
            if (file_match) {
              file = file_match[1];
            } else {
              const warning_match = warningLine.exec(line);
              if (warning_match) {
                errors.push({
                  file: file,
                  line: warning_match[1],
                  type: 'Warning',
                  message: warning_match[2]
                });
              }
            }
          });
          return errors;
        }
      } ];
    }
  };
}
