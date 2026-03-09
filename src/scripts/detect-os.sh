#!/bin/bash

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

detect_arch() {
    uname -m
}

detect_java() {
    if command -v java &> /dev/null; then
        java -version 2>&1 | head -n 1
    else
        echo "not_installed"
    fi
}

detect_memory() {
    if [ "$(uname)" == "Linux" ]; then
        free -g | awk '/^Mem:/{print $2}'
    elif [ "$(uname)" == "Darwin" ]; then
        echo "$(sysctl -n hw.memsize)/1024/1024/1024" | bc
    else
        echo "unknown"
    fi
}

detect_cpu() {
    if [ "$(uname)" == "Linux" ]; then
        nproc
    elif [ "$(uname)" == "Darwin" ]; then
        sysctl -n hw.ncpu
    else
        echo "unknown"
    fi
}

echo "{
  \"os\": \"$(detect_os)\",
  \"arch\": \"$(detect_arch)\",
  \"java\": \"$(detect_java)\",
  \"memory_gb\": $(detect_memory),
  \"cpu_cores\": $(detect_cpu)
}"