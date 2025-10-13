# Use the repo’s Node
nvm use 20.8.0

# Ensure/repair Apple toolchain
xcode-select --install || true
sudo xcode-select -s /Library/Developer/CommandLineTools
sudo xcodebuild -license accept || true
sudo xcodebuild -runFirstLaunch || true

# Point clang to the SDK (fixes '<exception>' not found)
export SDKROOT="$(xcrun --sdk macosx --show-sdk-path)"
export CPATH="$SDKROOT/usr/include/c++/v1"
export CC=clang CXX=clang++

# Clean and reinstall
rm -rf /Users/olegmelnicuk/work/lightdash/node_modules
pnpm install