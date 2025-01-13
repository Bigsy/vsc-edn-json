# EDN-JSON Converter Architecture

## Overview

The EDN-JSON Converter is a Visual Studio Code extension that enables seamless conversion between EDN (Extensible Data Notation) and JSON formats. It provides visual feedback during conversions and supports pretty-printing of EDN data.

## Core Components

### 1. Command Registration System
- Registers four main commands in VSCode:
  - `string-highlighter.convertJsonToEdn`: Converts JSON to EDN format
  - `string-highlighter.convertEdnToJson`: Converts EDN to JSON format
  - `string-highlighter.prettyPrint`: Pretty prints EDN and JSON data
  - `string-highlighter.flatten`: Flattens EDN or JSON data into a single line while maintaining valid format
- Commands are accessible through the editor context menu when text is selected

### 2. Text Processing Pipeline
- `processText` function serves as the central processing pipeline
- Handles multiple text selections simultaneously
- Provides visual feedback through temporary highlighting of converted text
- Reports conversion status through information messages

### 3. Formatting Utilities
- `prettyFormat` function for EDN formatting
  - Map formatting with aligned key-value pairs
  - Array/vector formatting with proper indentation
  - Basic value encoding
- Native JSON.stringify for JSON pretty printing
- Each format maintains its own structure and styling

### 3. Data Conversion System

#### JSON to EDN Conversion
1. Parses JSON string into JavaScript object
2. Transforms object keys into EDN keywords using `keywordizeObject`
3. Handles nested structures (arrays and objects)
4. Pretty prints the EDN structure with:
   - Aligned key-value pairs in maps
   - Proper indentation for nested structures
   - Consistent formatting for arrays and vectors
5. Outputs formatted EDN string

#### EDN to JSON Conversion
1. Parses EDN string using jsedn parser
2. Transforms EDN-specific types to JavaScript objects using `convertEdnToObj`
3. Handles EDN maps and vectors/lists
4. Stringifies result to formatted JSON

### 4. Debug System
- Dedicated output channel for debugging (`EDN Converter Debug`)
- Detailed logging of:
  - Input/output values
  - Intermediate conversion states
  - Error conditions
  - Processing steps

### 5. Error Handling
- Comprehensive error catching in conversion functions
- User-friendly error messages for invalid input
- Preserves original text on conversion failure
- Debug logging of error details for troubleshooting

## Dependencies

- **jsedn**: Core library for EDN parsing and encoding
- **vscode**: Visual Studio Code extension API

## User Interface

### Visual Elements
1. Context menu integration under "Convert EDN/JSON" submenu
2. Temporary highlighting of converted text (2-second duration)
3. Status messages for conversion results
4. Error notifications for invalid input

### Activation Events
- Commands are available when text is selected in the editor
- Extension activates on command execution

## Design Patterns

1. **Command Pattern**: Used for implementing conversion operations
2. **Factory Pattern**: Creation of text decorations and command registrations
3. **Pipeline Pattern**: Text processing and conversion flow
4. **Strategy Pattern**: Different conversion strategies for different data formats

## Extension Points

The architecture is designed to be extensible:
1. Additional text transformations can be added by creating new command registrations
2. Conversion logic can be enhanced by extending transformation functions
3. Visual feedback system can be customized through decoration types
4. Debug system can be extended for additional logging requirements
