# EDN-JSON Converter

A Visual Studio Code extension that allows you to convert between JSON and EDN formats with visual feedback.

## Features

- Convert between JSON and EDN formats
- Works with multiple selections
- Visual highlight effect shows which text was converted
- Convenient right-click menu access
- Only appears in context menu when text is selected

## Usage

1. Select any text in your editor (you can select multiple areas by holding Cmd/Ctrl while selecting)
2. Right-click on the selected text
3. Choose "Convert EDN/JSON" from the context menu
4. Select either:
   - "Convert JSON to EDN" to convert JSON to Clojure EDN format
   - "Convert EDN to JSON" to convert Clojure EDN to JSON format

## Examples

JSON/EDN Conversion:
```json
// JSON to EDN
{"name": "John", "age": 30, "hobbies": ["reading", "coding"]}
```
converts to:
```clojure
{:name "John" :age 30 :hobbies ["reading" "coding"]}
```

```clojure
// EDN to JSON
{:name "John" :age 30 :hobbies ["reading" "coding"]}
```
converts to:
```json
{
  "name": "John",
  "age": 30,
  "hobbies": ["reading", "coding"]
}
```

Formatting Commands:
```clojure
// Original EDN
{:config {:port 8080 :host "localhost" :features ["auth" "api" "admin"]} :env "prod"}

// After prettify
{:config {:port    8080
         :host     "localhost"
         :features ["auth"
                   "api"
                   "admin"]}
 :env    "prod"}

// After flatten
{:config {:port 8080 :host "localhost" :features ["auth" "api" "admin"]} :env "prod"}
```

## Requirements

- Visual Studio Code 1.60.0 or higher

## Extension Settings

This extension contributes the following commands:

* `string-highlighter.convertJsonToEdn`: Convert JSON to EDN format
* `string-highlighter.convertEdnToJson`: Convert EDN to JSON format
* `string-highlighter.prettyPrintEdn`: Format JSON/EDN data with consistent indentation and aligned keys
* `string-highlighter.flatten`: Remove all formatting and whitespace from JSON/EDN data
