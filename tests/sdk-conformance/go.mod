module github.com/vechain/rosetta/tests/sdk-conformance

go 1.24

// Pinned to the SDK that rosetta-cli (mesh-cli v0.10.4) is built on.
require (
	github.com/coinbase/rosetta-sdk-go v0.8.3
	github.com/coinbase/rosetta-sdk-go/types v1.0.0
)

require github.com/mitchellh/mapstructure v1.5.0 // indirect
