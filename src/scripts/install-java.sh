#!/bin/bash

echo "Minecraft Headless - Java Auto Installer"

JAVA_VERSION=${1:-17}
echo "Target Java version: $JAVA_VERSION"

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    elif [ -n "$TERMUX_VERSION" ]; then
        echo "termux"
    elif [ "$(uname)" == "Darwin" ]; then
        echo "macos"
    elif [ "$(expr substr $(uname -s) 1 5)" == "MINGW" ]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
echo "Detected OS: $OS"

install_java_17() {
    case $OS in
        ubuntu|debian)
            apt update
            apt install -y openjdk-17-jre-headless
            ;;
        centos|rhel|fedora)
            if command -v dnf &> /dev/null; then
                dnf install -y java-17-openjdk-headless
            else
                yum install -y java-17-openjdk-headless
            fi
            ;;
        arch)
            pacman -S --noconfirm jre17-openjdk-headless
            ;;
        termux)
            pkg install -y openjdk-17
            ;;
        macos)
            if ! command -v brew &> /dev/null; then
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew install openjdk@17
            ;;
        *)
            echo "Unsupported OS for Java 17 installation"
            return 1
            ;;
    esac
}

install_java_21() {
    case $OS in
        ubuntu|debian)
            apt update
            apt install -y openjdk-21-jre-headless
            ;;
        centos|rhel|fedora)
            if command -v dnf &> /dev/null; then
                dnf install -y java-21-openjdk-headless
            else
                yum install -y java-21-openjdk-headless
            fi
            ;;
        arch)
            pacman -S --noconfirm jre21-openjdk-headless
            ;;
        termux)
            echo "Java 21 not available in Termux, installing Java 17 instead"
            install_java_17
            ;;
        macos)
            if ! command -v brew &> /dev/null; then
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew install openjdk@21
            ;;
        *)
            echo "Unsupported OS for Java 21 installation"
            return 1
            ;;
    esac
}

if [ "$JAVA_VERSION" = "21" ]; then
    install_java_21
else
    install_java_17
fi

if [ $? -eq 0 ]; then
    echo "Java installation completed."
    java -version
else
    echo "Java installation failed."
    exit 1
fi