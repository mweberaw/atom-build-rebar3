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
        args: [ 'dialyzer', '--fullpath' ],
        sh: false,
        errorMatch: [ '(?<file>[\\/0-9a-zA-Z\\\\._-]+):(?<line>\\d+):\\s{1}(?<info>.*)' ]
      } ];
    }
  };
}
