// Command sdk-conformance checks recorded Rosetta API exchanges against
// rosetta-sdk-go, the SDK rosetta-cli is built on.
//
// Record exchanges by running the e2e tests with E2E_RECORD_FILE set, then:
//
//	go run . <exchanges.jsonl>
//
// For every exchange it checks that:
//   - the request and the response decode into the SDK types without unknown
//     fields, and re-encode to the same JSON (no missing required fields);
//   - the request passes the SDK server asserter and the response passes the
//     SDK client asserter, i.e. the checks rosetta-cli's fetcher runs;
//   - error responses are valid types.Error values declared in /network/options.
//
// Error-path requests are intentionally invalid, so only their responses are
// checked.
package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"reflect"
	"regexp"
	"sort"
	"strings"

	"github.com/coinbase/rosetta-sdk-go/asserter"
	"github.com/coinbase/rosetta-sdk-go/types"
)

type exchange struct {
	Endpoint string          `json:"endpoint"`
	Request  json.RawMessage `json:"request"`
	Status   int             `json:"status"`
	Response json.RawMessage `json:"response"`
}

type asserters struct {
	server *asserter.Asserter
	client *asserter.Asserter
}

// checker validates one successful exchange; it returns findings as "kind: detail".
type checker func(a asserters, request, response json.RawMessage) []string

func endpoint[Req any, Resp any](
	checkRequest func(a asserters, req *Req) error,
	checkResponse func(a asserters, req *Req, resp *Resp) error,
) checker {
	return func(a asserters, rawReq, rawResp json.RawMessage) []string {
		var findings []string
		req := new(Req)
		findings = append(findings, prefix("request", conform(rawReq, req))...)
		if err := checkRequest(a, req); err != nil {
			findings = append(findings, "request: SDK server asserter: "+err.Error())
		}
		resp := new(Resp)
		findings = append(findings, prefix("response", conform(rawResp, resp))...)
		if err := checkResponse(a, req, resp); err != nil {
			findings = append(findings, "response: SDK client asserter: "+err.Error())
		}
		return findings
	}
}

var endpoints = map[string]checker{
	"/network/list": endpoint(
		func(a asserters, r *types.MetadataRequest) error { return a.server.MetadataRequest(r) },
		func(a asserters, _ *types.MetadataRequest, r *types.NetworkListResponse) error {
			return asserter.NetworkListResponse(r)
		}),
	"/network/options": endpoint(
		func(a asserters, r *types.NetworkRequest) error { return a.server.NetworkRequest(r) },
		func(a asserters, _ *types.NetworkRequest, r *types.NetworkOptionsResponse) error {
			return asserter.NetworkOptionsResponse(r)
		}),
	"/network/status": endpoint(
		func(a asserters, r *types.NetworkRequest) error { return a.server.NetworkRequest(r) },
		func(a asserters, _ *types.NetworkRequest, r *types.NetworkStatusResponse) error {
			return asserter.NetworkStatusResponse(r)
		}),
	"/account/balance": endpoint(
		func(a asserters, r *types.AccountBalanceRequest) error { return a.server.AccountBalanceRequest(r) },
		func(a asserters, q *types.AccountBalanceRequest, r *types.AccountBalanceResponse) error {
			return asserter.AccountBalanceResponse(q.BlockIdentifier, r)
		}),
	"/block": endpoint(
		func(a asserters, r *types.BlockRequest) error { return a.server.BlockRequest(r) },
		func(a asserters, _ *types.BlockRequest, r *types.BlockResponse) error { return a.client.Block(r.Block) }),
	"/block/transaction": endpoint(
		func(a asserters, r *types.BlockTransactionRequest) error { return a.server.BlockTransactionRequest(r) },
		func(a asserters, _ *types.BlockTransactionRequest, r *types.BlockTransactionResponse) error {
			return a.client.Transaction(r.Transaction)
		}),
	"/mempool": endpoint(
		func(a asserters, r *types.NetworkRequest) error { return a.server.NetworkRequest(r) },
		func(a asserters, _ *types.NetworkRequest, r *types.MempoolResponse) error {
			return asserter.MempoolTransactions(r.TransactionIdentifiers)
		}),
	"/mempool/transaction": endpoint(
		func(a asserters, r *types.MempoolTransactionRequest) error {
			return a.server.MempoolTransactionRequest(r)
		},
		func(a asserters, _ *types.MempoolTransactionRequest, r *types.MempoolTransactionResponse) error {
			return a.client.Transaction(r.Transaction)
		}),
	"/events/blocks": endpoint(
		func(a asserters, r *types.EventsBlocksRequest) error { return a.server.EventsBlocksRequest(r) },
		func(a asserters, _ *types.EventsBlocksRequest, r *types.EventsBlocksResponse) error {
			return asserter.EventsBlocksResponse(r)
		}),
	"/search/transactions": endpoint(
		func(a asserters, r *types.SearchTransactionsRequest) error {
			return a.server.SearchTransactionsRequest(r)
		},
		func(a asserters, _ *types.SearchTransactionsRequest, r *types.SearchTransactionsResponse) error {
			return a.client.SearchTransactionsResponse(r)
		}),
	"/construction/derive": endpoint(
		func(a asserters, r *types.ConstructionDeriveRequest) error {
			return a.server.ConstructionDeriveRequest(r)
		},
		func(a asserters, _ *types.ConstructionDeriveRequest, r *types.ConstructionDeriveResponse) error {
			return asserter.ConstructionDeriveResponse(r)
		}),
	"/construction/preprocess": endpoint(
		func(a asserters, r *types.ConstructionPreprocessRequest) error {
			return a.server.ConstructionPreprocessRequest(r)
		},
		func(a asserters, _ *types.ConstructionPreprocessRequest, r *types.ConstructionPreprocessResponse) error {
			return asserter.ConstructionPreprocessResponse(r)
		}),
	"/construction/metadata": endpoint(
		func(a asserters, r *types.ConstructionMetadataRequest) error {
			return a.server.ConstructionMetadataRequest(r)
		},
		func(a asserters, _ *types.ConstructionMetadataRequest, r *types.ConstructionMetadataResponse) error {
			return asserter.ConstructionMetadataResponse(r)
		}),
	"/construction/payloads": endpoint(
		func(a asserters, r *types.ConstructionPayloadsRequest) error {
			return a.server.ConstructionPayloadsRequest(r)
		},
		func(a asserters, _ *types.ConstructionPayloadsRequest, r *types.ConstructionPayloadsResponse) error {
			return asserter.ConstructionPayloadsResponse(r)
		}),
	"/construction/parse": endpoint(
		func(a asserters, r *types.ConstructionParseRequest) error {
			return a.server.ConstructionParseRequest(r)
		},
		func(a asserters, q *types.ConstructionParseRequest, r *types.ConstructionParseResponse) error {
			return a.client.ConstructionParseResponse(r, q.Signed)
		}),
	"/construction/combine": endpoint(
		func(a asserters, r *types.ConstructionCombineRequest) error {
			return a.server.ConstructionCombineRequest(r)
		},
		func(a asserters, _ *types.ConstructionCombineRequest, r *types.ConstructionCombineResponse) error {
			return asserter.ConstructionCombineResponse(r)
		}),
	"/construction/hash": endpoint(
		func(a asserters, r *types.ConstructionHashRequest) error { return a.server.ConstructionHashRequest(r) },
		func(a asserters, _ *types.ConstructionHashRequest, r *types.TransactionIdentifierResponse) error {
			return asserter.TransactionIdentifierResponse(r)
		}),
	"/construction/submit": endpoint(
		func(a asserters, r *types.ConstructionSubmitRequest) error {
			return a.server.ConstructionSubmitRequest(r)
		},
		func(a asserters, _ *types.ConstructionSubmitRequest, r *types.TransactionIdentifierResponse) error {
			return asserter.TransactionIdentifierResponse(r)
		}),
}

// conform decodes raw strictly into v and compares the re-encoded JSON with raw.
func conform(raw json.RawMessage, v interface{}) []string {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(v); err != nil {
		return []string{"does not decode into " + reflect.TypeOf(v).Elem().Name() + ": " + err.Error()}
	}
	reencoded, err := json.Marshal(v)
	if err != nil {
		return []string{"cannot re-encode: " + err.Error()}
	}
	var original, roundTrip interface{}
	_ = json.Unmarshal(raw, &original)
	_ = json.Unmarshal(reencoded, &roundTrip)
	var findings []string
	compare("", original, roundTrip, &findings)
	return findings
}

func isEmpty(v interface{}) bool {
	switch x := v.(type) {
	case nil:
		return true
	case map[string]interface{}:
		return len(x) == 0
	case []interface{}:
		return len(x) == 0
	}
	return false
}

// SDK v0.8.3 encodes deprecated fields together with their replacements
// (custom MarshalJSON on SigningPayload, ConstructionDeriveResponse and
// ConstructionParseResponse). A response carrying either one is valid.
var aliases = map[string]string{
	"account_identifier":         "address",
	"address":                    "account_identifier",
	"signers":                    "account_identifier_signers",
	"account_identifier_signers": "signers",
}

func compare(path string, original, roundTrip interface{}, findings *[]string) {
	switch o := original.(type) {
	case map[string]interface{}:
		r, _ := roundTrip.(map[string]interface{})
		for key, value := range o {
			if _, ok := r[key]; !ok && !isEmpty(value) {
				*findings = append(*findings, fmt.Sprintf("field %s.%s is dropped by the SDK type", path, key))
			}
		}
		for key, value := range r {
			if _, ok := o[key]; !ok {
				if alias, isAlias := aliases[key]; isAlias {
					if _, hasAlias := o[alias]; hasAlias {
						continue
					}
				}
				*findings = append(*findings, fmt.Sprintf("required field %s.%s is missing (SDK encodes it as %s)", path, key, encode(value)))
				continue
			}
			compare(path+"."+key, o[key], value, findings)
		}
	case []interface{}:
		r, _ := roundTrip.([]interface{})
		for i := range o {
			if i < len(r) {
				compare(fmt.Sprintf("%s[]", path), o[i], r[i], findings)
			}
		}
	default:
		if !reflect.DeepEqual(original, roundTrip) {
			*findings = append(*findings, fmt.Sprintf("field %s changes from %s to %s", path, encode(original), encode(roundTrip)))
		}
	}
}

func encode(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func prefix(p string, findings []string) []string {
	for i := range findings {
		findings[i] = p + ": " + findings[i]
	}
	return findings
}

// Volatile values (hashes, numbers, addresses) are masked so that the same
// problem seen in many exchanges is reported once.
var volatile = regexp.MustCompile(`0x[0-9a-fA-F]{8,}|\b\d+\b`)

func main() {
	if len(os.Args) != 2 {
		fmt.Fprintln(os.Stderr, "usage: sdk-conformance <exchanges.jsonl>")
		os.Exit(2)
	}
	exchanges := load(os.Args[1])
	a := buildAsserters(exchanges)

	type finding struct {
		count   int
		example string
	}
	findings := map[string]map[string]*finding{}
	checked := map[string]int{}
	record := func(ep, f, example string) {
		key := volatile.ReplaceAllString(f, "#")
		if findings[ep] == nil {
			findings[ep] = map[string]*finding{}
		}
		if findings[ep][key] == nil {
			findings[ep][key] = &finding{example: example}
		}
		findings[ep][key].count++
	}

	for _, ex := range exchanges {
		checked[ex.Endpoint]++
		if ex.Status != 200 {
			rosettaErr := new(types.Error)
			for _, f := range prefix("error response", conform(ex.Response, rosettaErr)) {
				record(ex.Endpoint, f, f)
			}
			if err := a.client.Error(rosettaErr); err != nil {
				record(ex.Endpoint, "error response: SDK client asserter: "+err.Error(), string(ex.Response))
			}
			continue
		}
		check, ok := endpoints[ex.Endpoint]
		if !ok {
			record(ex.Endpoint, "endpoint is not part of the Rosetta API", ex.Endpoint)
			continue
		}
		for _, f := range check(a, ex.Request, ex.Response) {
			record(ex.Endpoint, f, f)
		}
	}

	names := make([]string, 0, len(checked))
	for name := range checked {
		names = append(names, name)
	}
	sort.Strings(names)
	failed := false
	fmt.Printf("%-28s %10s  %s\n", "ENDPOINT", "EXCHANGES", "RESULT")
	for _, name := range names {
		status := "OK"
		if len(findings[name]) > 0 {
			status = fmt.Sprintf("%d finding(s)", len(findings[name]))
			failed = true
		}
		fmt.Printf("%-28s %10d  %s\n", name, checked[name], status)
	}
	for _, name := range names {
		for _, f := range findings[name] {
			fmt.Printf("\n[%s] (%d exchange(s))\n  %s\n", name, f.count, strings.ReplaceAll(f.example, "\n", "\n  "))
		}
	}
	if failed {
		os.Exit(1)
	}
}

func load(path string) []exchange {
	file, err := os.Open(path)
	if err != nil {
		fail(err)
	}
	defer file.Close()
	var exchanges []exchange
	scanner := bufio.NewScanner(file)
	scanner.Buffer(make([]byte, 0, 1<<20), 64<<20)
	for scanner.Scan() {
		var ex exchange
		if err := json.Unmarshal(scanner.Bytes(), &ex); err != nil {
			fail(fmt.Errorf("invalid record: %w", err))
		}
		exchanges = append(exchanges, ex)
	}
	if err := scanner.Err(); err != nil {
		fail(err)
	}
	return exchanges
}

// buildAsserters initializes the SDK asserters the way rosetta-cli does, from
// the recorded /network/list, /network/status and /network/options responses.
func buildAsserters(exchanges []exchange) asserters {
	var list *types.NetworkListResponse
	var status *types.NetworkStatusResponse
	var options *types.NetworkOptionsResponse
	for _, ex := range exchanges {
		if ex.Status != 200 {
			continue
		}
		switch ex.Endpoint {
		case "/network/list":
			list = new(types.NetworkListResponse)
			_ = json.Unmarshal(ex.Response, list)
		case "/network/status":
			status = new(types.NetworkStatusResponse)
			_ = json.Unmarshal(ex.Response, status)
		case "/network/options":
			options = new(types.NetworkOptionsResponse)
			_ = json.Unmarshal(ex.Response, options)
		}
	}
	if list == nil || status == nil || options == nil || len(list.NetworkIdentifiers) == 0 {
		fail(fmt.Errorf("the recording needs successful /network/list, /network/status and /network/options exchanges"))
	}
	network := list.NetworkIdentifiers[0]
	client, err := asserter.NewClientWithResponses(network, status, options, "")
	if err != nil {
		fail(fmt.Errorf("SDK client asserter rejects /network/status or /network/options: %w", err))
	}
	server, err := asserter.NewServer(
		options.Allow.OperationTypes,
		options.Allow.HistoricalBalanceLookup,
		[]*types.NetworkIdentifier{network},
		options.Allow.CallMethods,
		options.Allow.MempoolCoins,
		"",
	)
	if err != nil {
		fail(fmt.Errorf("SDK server asserter rejects /network/options: %w", err))
	}
	return asserters{server: server, client: client}
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(2)
}
