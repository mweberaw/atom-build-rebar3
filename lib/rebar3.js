'use babel';

import fs from 'fs';

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
        warningMatch: ['(?<file>([A-Z]:)?[\\/0-9a-zA-Z\\\\._-]+):(?<line>\\d+): Warning: (?<message>.+)'],
        errorMatch: [ '(?<file>([A-Z]:)?[\\/0-9a-zA-Z\\\\._-]+):(?<line>\\d+):(?! Warning:)\\s+(?<message>.+)' ]
      },
      {
        name: 'Rebar3: test',
        exec: exec,
        args: [ 'test' ],
        sh: false,
        // TODO
        errorMatch: [ '(?<file>[\\/0-9a-zA-Z\\\\._-]+):(?<line>\\d+)' ]
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
        sh: false,
        functionMatch: function(output) {
          const filePath = /^(?!===>)[\/0-9a-zA-Z\\._-]+$/;
          const warningLine = /^ (\d+):\s*(.+)$/;

          const errors = [];

          var file = null;

          output.split(/\r?\n/).forEach(line => {
            const file_match = filePath.exec(line);
            if (file_match) {
              file = file_match[0];
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
