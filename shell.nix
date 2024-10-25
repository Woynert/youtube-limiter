with import <nixpkgs> {};
pkgs.mkShell {
  name = "dev-environment";
  buildInputs = [
    pkgs.nodejs-slim
    pkgs.zip
  ];
  shellHook = ''
    # git prompt
    source ${git}/share/git/contrib/completion/git-prompt.sh
    PS1='\[\033[0;33m\]nix:\w\[\033[0m\] $(__git_ps1 %s)\n$ '
  '';
}

