{ pkgs }: {
  # Stable nixpkgs channel
  channel = "stable-24.05";

  # Packages available in the workspace
  packages = [
    pkgs.nodejs_20
    pkgs.yarn
    pkgs.nodePackages.pnpm
    pkgs.bun

    # Firebase emulators require Java (pin LTS)
    pkgs.jdk21
  ];

  # Environment variables
  env = {
    JAVA_HOME = "${pkgs.jdk21}/lib/openjdk";
  };

  idx = {
    # VS Code / IDX extensions
    extensions = [
      "google.gemini-cli-vscode-ide-companion"
    ];

    workspace = {
      # Runs only once when the workspace is created
      onCreate = {
        npm-install = "npm ci --no-audit --prefer-offline --no-progress";

        # Files to open on first workspace load (MUST live here)
        default.openFiles = [
          "functions/src/index.ts"
          "firestore.rules"
          "firebase.json"
          "app/page.tsx"
        ];
      };
    };

    # ✅ Previews MUST live under idx.previews (not top-level)
    previews = {
      enable = true;

      previews = {
        web = {
          command = [
            "npm"
            "run"
            "dev"
            "--"
            "--port"
            "$PORT"
            "--hostname"
            "0.0.0.0"
          ];
          manager = "web";
        };
      };
    };
  };
}
