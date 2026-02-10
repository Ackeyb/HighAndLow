type MessageDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

export default function MessageDialog({
  open,
  title = "確認",
  message,
  onConfirm,
  onCancel,
}: MessageDialogProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: "300px",
          background: "white",
          borderRadius: "16px",
          padding: "16px",
          textAlign: "center",
          boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
          {title}
        </div>

        <div style={{ marginBottom: "16px", fontSize: "0.95em" }}>
          {message}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                height: "36px",
                borderRadius: "9999px",
                border: "1px solid #ccc",
                background: "#f5f5f5",
                cursor: "pointer",
              }}
            >
              いいえ
            </button>
          )}

          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              height: "36px",
              borderRadius: "9999px",
              border: "none",
              background: "#fb7185",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            はい
          </button>
        </div>
      </div>
    </div>
  );
}
