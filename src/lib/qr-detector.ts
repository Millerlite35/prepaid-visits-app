// QR reading from a camera, shared by the staff scanner and the self check-in screen.
// Browser-only (call from client components).

export type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type NativeDetectorClass = {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats(): Promise<string[]>;
};

// Use the browser's built-in QR reader where there is one (Chrome on Android); otherwise
// our self-hosted decoder (needed for iPhone Safari).
export async function makeDetector(): Promise<Detector> {
  const Native = (window as unknown as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
  if (Native) {
    try {
      if ((await Native.getSupportedFormats()).includes("qr_code")) return new Native({ formats: ["qr_code"] });
    } catch {
      // fall through to the decoder below
    }
  }
  const mod = await import("barcode-detector/ponyfill");
  mod.prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm") ? `/vendor/zxing_reader-${mod.ZXING_WASM_VERSION}.wasm` : prefix + path,
    },
  });
  return new mod.BarcodeDetector({ formats: ["qr_code"] });
}

// Plain-language reason a camera couldn't start.
export function cameraErrorMessage(e: unknown, fallback: string): string {
  if (!window.isSecureContext) return "The camera only works on a secure (https) address.";
  const name = e instanceof Error ? e.name : "";
  const messages: Record<string, string> = {
    NotAllowedError:
      "Camera access is blocked. Allow the camera for this site in your browser settings (the camera icon in the address bar), then try again.",
    SecurityError: "This browser or app doesn't allow camera access. Open this page in Chrome, Edge or Safari.",
    NotFoundError: "No camera was found on this device.",
    OverconstrainedError: "No camera was found on this device.",
    NotReadableError: "The camera is busy in another app (e.g. Zoom or Teams). Close it there and try again.",
  };
  return messages[name] ?? fallback;
}
