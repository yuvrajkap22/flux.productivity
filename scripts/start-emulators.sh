#!/usr/bin/env bash
# Start Firebase emulators (auth + firestore) with JAVA_HOME detection
set -e
PROJECT_ID="flux-productivity-39c09"

# Try to find a Java 21+ runtime
JAVA_HOME_CANDIDATE=""
if command -v /usr/libexec/java_home >/dev/null 2>&1; then
  # prefer 21+
  JAVA_HOME_CANDIDATE=$(/usr/libexec/java_home -v21+ 2>/dev/null || true)
fi
if [ -z "$JAVA_HOME_CANDIDATE" ] && [ -d "/Library/Java/JavaVirtualMachines/temurin-26.jdk/Contents/Home" ]; then
  JAVA_HOME_CANDIDATE="/Library/Java/JavaVirtualMachines/temurin-26.jdk/Contents/Home"
fi

if [ -n "$JAVA_HOME_CANDIDATE" ]; then
  export JAVA_HOME="$JAVA_HOME_CANDIDATE"
  export PATH="$JAVA_HOME/bin:$PATH"
  echo "Using JAVA_HOME=$JAVA_HOME"
else
  echo "Could not detect JDK 21+. Please install OpenJDK 21+ (Homebrew: brew install openjdk@21) and re-run." >&2
  exit 1
fi

# Start emulators
npx firebase-tools emulators:start --only auth,firestore --project "$PROJECT_ID"
