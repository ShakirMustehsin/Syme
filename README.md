# Syme: Advanced PDF Forensic Manipulation Engine

![Syme Header](https://raw.githubusercontent.com/ShakirMustehsin/Syme/main/assets/banner.png)

**Syme** is a professional-grade, offline-first PDF manipulation and redaction suite designed for high-precision text extraction and structural sanitization. Built for legal professionals, researchers, and developers, Syme handles everything from basic string removal to complex regex-based forensic scrubbing across documents of any scale.

## 🚀 Key Features

### 🔍 Linguistic Detection Engine
- **String Mode**: Rapid literal text matching for quick cleanups.
- **Word Mode (Linguistic)**: Advanced tokenization that respects word boundaries (e.g., target "pro" without affecting "professional").
- **Regex Mode (Expert)**: Powerful pattern matching for sensitive data like SSNs, emails, and custom markers.

### 🛡️ Forensic Sanitization
- **Structural Masking**: Applies visual white-out masks aligned to exact pixel coordinates.
- **Binary DNA Wipe**: Performs an in-place buffer overwrite of the underlying PDF content streams to ensure permanent data removal.
- **Link & Metadata Stripping**: Automatically detects and destroys hidden interactive elements and URL annotations.

### ⚡ Performance at Scale
- **Streaming Pipeline**: Page-by-page processing architecture optimized for 1000+ page documents.
- **Zero-Latency UI**: Background processing in the Electron Main thread keeps the interface fluid during heavy operations.
- **Offline First**: All processing happens locally on your machine. Your data never leaves your device.

## 🛠️ Technology Stack
- **Core**: Electron / Node.js
- **Frontend**: React / Vite / Framer Motion
- **Engine**: pdf-lib / Raw Binary Buffer Manipulation
- **Styling**: Vanilla CSS (Premium Glassmorphism Design)

## 📥 Getting Started

### Installation
1. **Clone the repo**
   ```bash
   git clone https://github.com/ShakirMustehsin/Syme.git
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Run in development**
   ```bash
   npm run electron:dev
   ```

## 📦 Distribution (Generating the .exe)

To generate a standalone Windows executable (`.exe`), Syme uses `electron-builder`.

1. **Build the production assets**:
   ```bash
   npm run build
   ```
2. **Package the application**:
   ```bash
   npm run dist
   ```
The executable will be generated in the `/dist` folder.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.

---
*Built with precision for the modern forensic era.*
