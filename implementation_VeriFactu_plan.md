# Upgrade VeriFactu Integration

This plan outlines the upgrade of the VeriFactu integration to comply with the technical requirements specified in [VeriFactu_Nuxt.pdf](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/.gemini/VeriFactu_Nuxt.pdf). We will transition from a mock implementation to a robust, "Clean Architecture" based system with SHA-256 chaining and actual SOAP submission capabilities.

## User Review Required

> [!IMPORTANT]
> This update introduces dependencies on `soap` and `xadesjs` for AEAT communication.
> It requires a valid `.p12` digital certificate for secure transmission in production.
> We will use `useRuntimeConfig()` for sensitive credentials.

## Proposed Changes

### VeriFactu Infrastructure (Shared & Server)

---

#### [NEW] [invoice.ts](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/shared/types/invoice.ts)

Define core interfaces used in VeriFactu logic.
- `IInvoice`: Base invoice data.
- `IIssuer`: NIF and Name.

#### [NEW] [invoiceGenerators.ts](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/server/utils/invoiceGenerators.ts)

Logic for cryptographic operations and URL formatting.
- [generateInvoiceHash](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/server/utils/verifactu.ts#41-64): Precise SHA-256 concatenation and chaining.
- `generateQrUrl`: QR verification URL following AEAT format.

#### [NEW] [aeatSoapClient.ts](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/server/utils/aeatSoapClient.ts)

Actual SOAP communication logic.
- `submitToAeat`: Uses `soap` and `https.Agent` with pfx certificate.

#### [MODIFY] [verifactu.ts](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/server/utils/verifactu.ts)

Refactor to use the new generators and act as a simplified entry point or service.

---

### Sales API Integration

#### [MODIFY] [index.ts](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/server/api/sales/carts/index.ts)

Update the `completed` sale logic to use the new VeriFactu orchestrator.

### Configuration

#### [MODIFY] [nuxt.config.ts](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/nuxt.config.ts)

Register AEAT runtime configuration:
- `aeatWsdlUrl`
- `aeatP12CertPath`
- `aeatP12Password`

---

### Cleanup

#### [DELETE] Existing redundant VeriFactu mocks if any.

## Verification Plan

### Automated Tests
- **Unit Tests**: Create `tests/verifactu.test.ts` to verify:
  - [generateInvoiceHash](file:///c:/Users/VENOM/Repositorio/beils-belleza-honesta-dashboard/server/utils/verifactu.ts#41-64) with sample data.
  - `generateQrUrl` formatting.
- **Integration**: Verify that `submitToAeat` correctly handles configuration (mocking the network layer).

### Manual Verification
1.  Complete a sale in the TPV.
2.  Inspect the `Cart` record in the database (`invoice_number`, `hash`, `qr_content`).
3.  Cross-reference the generated hash with the manual calculation example from the PDF.
4.  Verify the QR URL points to the correct AEAT sandbox environment.
