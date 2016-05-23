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
        functionMatch: function (output) {
          const failedRegex = /^\s*(.*)[.]{3}\*failed\*$/;
          const locationRegex = /^in function\s+[^(]+\(.*_build[\/\\]test[\/\\]lib[\/\\][^\/\\]+[\/\\](.+), line (\d+)\)$/;
          const errorStartRegex = /^\*\*error:(.*)$/;
          const errorEndRegex = /^\s*output:/;

          const errors = [];

          let state = 'idle';
          let file = null;
          let lineNo = -1;
          let message = null;
          let description = [];

          output.split(/\r?\n/).forEach(line => {
            switch (state) {
              case 'idle':
                const failedMatch = failedRegex.exec(line);
                if (failedMatch) {
                  message = failedMatch[1] + ' failed';
                  state = 'findlocation';
                }
                break;
              case 'findlocation':
                const locationMatch = locationRegex.exec(line);
                if (locationMatch) {
                  file = locationMatch[1];
                  lineNo = locationMatch[2];
                  state = 'findmessagestart';
                }
                break;
              case 'findmessagestart':
                const errorStartMatch = errorStartRegex.exec(line);
                if (errorStartMatch) {
                  description.push(errorStartMatch[1]);
                  state = 'findmessageend';
                }
                break;
              case 'findmessageend':
                const errorEndMatch = errorEndRegex.exec(line);
                if (errorEndMatch) {
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
          TERM: 'xterm-old' // disable color output
        },
        sh: false,
        functionMatch: function (output) {
          const filePath = /^(?!===>)[^\/\\]*_build[\/\\]default[\/\\]lib[\/\\][^\/\\]+[\/\\](.+)$/;
          const warningLine = /^\s*(\d+):\s*(.+)$/;

          const errors = [];

          let file = null;

          output.split(/\r?\n/).forEach(line => {
            const fileMatch = filePath.exec(line);
            if (fileMatch) {
              file = fileMatch[1];
            } else {
              const warningMatch = warningLine.exec(line);
              if (warningMatch) {
                errors.push({
                  file: file,
                  line: warningMatch[1],
                  type: 'Warning',
                  message: warningMatch[2]
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
