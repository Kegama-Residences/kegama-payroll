# Kegama Payroll & Payslip (Capacitor for Phone & Tablet) — Philippine Edition

A production-grade, phone- and tablet-optimized Philippine Payroll and Payslip generation and printing application built with **Capacitor**, **React**, **TypeScript**, and **Tailwind CSS**.

Strictly configured for **Philippine Pesos (PHP ₱)** and compliant with standard **DOLE Labor Code** and **BIR TRAIN Law** payroll regulations.

---

## 🇵🇭 Philippine Payroll & Statutory Compliance

### 1. Currency & Pay Frequency
- **Currency**: Exclusively **Philippine Peso (PHP ₱)**.
- **Pay Schedules**:
  - **Semi-Monthly ("Quincena")**: 1st Cut-Off (1st–15th, credited on the 15th) and 2nd Cut-Off (16th–30th/31st, credited on the 30th/31st).
  - **Monthly**: Full month calendar disbursals.

### 2. Mandatory Statutory Computations
- **Social Security System (SSS)**:
  - Computed on Monthly Salary Credit (MSC) capped at ₱35,000 (2025–2026 SSS Circular schedule).
  - 5.0% Employee share, 10.0% Employer share (split 50/50 across semi-monthly cut-offs).
- **PhilHealth**:
  - 5% total premium rate shared equally between Employee (2.5%) and Employer (2.5%).
  - Floor: ₱500 total (₱10,000 base). Ceiling: ₱5,000 total (₱100,000 base).
- **Pag-IBIG / HDMF**:
  - Standard mandatory contribution of ₱200 Employee and ₱200 Employer per month (₱100 EE per semi-monthly cutoff).
- **BIR Withholding Tax on Compensation**:
  - Exact graduated tax brackets under the Philippine **TRAIN Law** for both semi-monthly and monthly payroll frequencies.
  - Taxable Income = Gross Taxable Earnings − (SSS EE + PhilHealth EE + Pag-IBIG EE + Non-Taxable De Minimis Benefits).
- **Overtime & Tardiness**:
  - DOLE-mandated 125% regular workday overtime computation (`hourlyRate * 1.25 * otHours`).
  - Minute-by-minute late/undertime deduction tracking.
- **De Minimis Non-Taxable Benefits**:
  - Non-taxable allowances under BIR regulations (Rice Subsidy, Uniform & Clothing allowance, Medical cash allowance).

---

## 🖨️ Production Printing & DOLE-Compliant Payslips

### Authentic Corporate Payslip Architecture
- **Header**: Corporate SEC/DTI name, BIR TIN, BIR RDO code, SSS Employer Number, PhilHealth Employer Number, Pag-IBIG Employer Number, and BGC/Metro Manila office address.
- **Employee Identification**: Name, Employee ID, designation, department, and mandatory government IDs (BIR TIN, SSS, PhilHealth PIN, Pag-IBIG MID) with masked bank account credentials (BDO, BPI, Metrobank, UnionBank, GCash/Maya).
- **Tabular Ledger**:
  - **Earnings**: Basic Pay, Overtime Pay (125%), De Minimis Benefits, Taxable Allowances, Special Incentives, Less: Tardiness Deduction.
  - **Deductions**: SSS EE, PhilHealth EE, Pag-IBIG EE, BIR Withholding Tax, SSS Salary Loan amortizations.
- **Net Take-Home Pay**: High-contrast, bold display in Philippine Pesos (`₱XX,XXX.XX`).
- **Employer Remittances**: Transparent breakdown of SSS ER, PhilHealth ER, and HDMF ER contributions.
- **Legal Acknowledgment**: Official DOLE Art. 103 employee receipt and quitclaim clause.
- **Signatures & Security**: Prepared/Approved corporate signatory stamp and verifiable cryptographic QR code hash.

### Printing Engine
- **Direct System Print**:
  - Android native `PrintManager` bridge in `MainActivity.java` triggering Android's Print Spooler.
  - iOS AirPrint integration.
  - Isolated iframe printing in WebView/Desktop enforcing clean US Letter (8.5×11") portrait pages with zero browser UI headers/footers.
- **Batch Print**: 1-click **Print All** button for entire payroll cut-off batches with CSS `page-break-after: always;`.
- **Vector PDF Generator & Share**: Client-side 2x resolution PDF generation via `jsPDF` & `html2canvas` with native mobile sharing via `@capacitor/filesystem` and `@capacitor/share`.

---

## 📱 Phone & Tablet Adaptive Layout

- **Tablet Mode (`>= 768px`)**:
  - Split-screen executive master-detail layout.
  - Left: list of employees with net pay, overtime indicators, and quick filters.
  - Right: live interactive A4 Payslip Inspector with 1-click **Print**, **Adjust OT/Incentives**, and **Download PDF**.
- **Phone Mode (`< 768px`)**:
  - Mobile bottom navigation bar with safe-area padding (`viewport-fit=cover`).
  - Full-screen modal payslip viewer with zoom controls, previous/next employee switcher, and floating action dock.

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Build and sync Capacitor native mobile assets
npm run build
npm run cap:sync

# Run web preview
npm run dev

# Open Android project in Android Studio (Phone & Tablet)
npm run cap:android

# Open iOS project in Xcode (on macOS)
npm run cap:ios
```

---

## 🚀 Mobile CI/CD Workflow & Release Packages (Android APK & iOS)

### App Branding
- **Official App Name**: **KEGAMA Payroll**
- **Android Package ID**: `com.kegama.payroll`
- **iOS Bundle ID**: `com.kegama.payroll`

### Automated Cloud Workflow (`.github/workflows/build-mobile.yml`)
The repository includes an enterprise-grade GitHub Actions CI/CD workflow that builds both Android APK and iOS packages automatically:

1. **Android Build (`build-android`)**:
   - Runs on `ubuntu-latest` with JDK 17 and Android SDK.
   - Compiles TypeScript and builds the web bundle (`dist/`).
   - Syncs native Android project via Capacitor.
   - Automatically signs the release build with `android/app/kegama-release.keystore`.
   - Generates two APK artifacts:
     - `KEGAMA-Payroll-Release-Signed.apk` (Signed Release APK)
     - `KEGAMA-Payroll-Debug.apk` (Instant-install Debug APK)
2. **iOS Build (`build-ios`)**:
   - Runs on `macos-14` with Xcode 15.4.
   - Installs CocoaPods dependencies.
   - Compiles `.xcarchive` and packages:
     - `KEGAMA-Payroll-v1.0.0.ipa` (Installable iOS Application Package)
     - `KEGAMA-Payroll.xcarchive.zip` (Full Xcode Archive)

### Android Keystore Signature Details
| Parameter | Value |
| :--- | :--- |
| **Keystore File** | `android/app/kegama-release.keystore` (PKCS12 format) |
| **Key Alias** | `kegama` |
| **Keystore Password** | `kegama_payroll_secret_2026` |
| **Validity** | 10,000 Days (~27 Years) |
| **Certificate Subject** | `CN=KEGAMA Payroll, OU=Hospitality Systems, O=Kegama Residences Inc, L=Taguig City, ST=Metro Manila, C=PH` |
| **SHA-256 Fingerprint** | `74:F0:5F:0B:14:B2:A6:D7:61:45:2C:9F:B5:1D:25:74:55:34:2A:FC:29:85:8E:21:55:F9:36:C4:74:0F:CD:65` |

### Local Offline-First Architecture & Data Privacy
All employee records, statutory contributions, work schedules, and payroll runs are persisted locally on the device via Capacitor Preferences and LocalStorage:
- **No Remote Backend Required**: Zero external server dependencies or API secret exposure.
- **Data Portability**: Full JSON backup export and import with cryptographic integrity validation.
- **Native Sharing**: Exported backups and statutory CSV reports leverage native mobile sharing (Files, Drive, Mail).

### GitHub Repository Secrets Reference
To configure automated Android signing in your GitHub repository, configure these under **Settings > Secrets and variables > Actions**:
- `ANDROID_KEYSTORE_BASE64`: Base64 string of `kegama-release.keystore` (found in `android/app/kegama-release.keystore.base64`).
- `ANDROID_KEYSTORE_PASSWORD`: `kegama_payroll_secret_2026`
- `ANDROID_KEY_ALIAS`: `kegama`
- `ANDROID_KEY_PASSWORD`: `kegama_payroll_secret_2026`

### Helper Utility Scripts
- `./scripts/generate-keystore.sh`: Regenerates an Android release keystore and outputs its Base64 string.
- `./scripts/build-mobile.sh`: Prepares web assets and syncs Android/iOS native projects locally.
