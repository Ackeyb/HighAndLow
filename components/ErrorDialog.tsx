import { ReactNode } from "react";

type Props = {
  open: boolean;
  title?: string;
  message: ReactNode;
  onClose: () => void;
};

export default function MessageDialog({
  open,
  title = "お知らせ",
  message,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          width: "90%",
          maxWidth: "320px",
          backgroundColor: "#fff",
          borderRadius: "18px",
          padding: "20px 16px",
          boxShadow: "0 10px 28px rgba(0,0,0,0.25)",
          animation: "pop 0.2s ease-out",
        }}
      >
        {/* タイトル */}
        <div
          style={{
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "1.1rem",
            marginBottom: "12px",
            color: "#b44562",
          }}
        >
          ⚠️ {title}
        </div>

        {/* メッセージ */}
        <div
          style={{
            textAlign: "center",
            fontSize: "0.95rem",
            color: "#6b3a44",
            lineHeight: 1.6,
            marginBottom: "18px",
          }}
        >
          {message}
        </div>

        {/* OKボタン */}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "999px",
            border: "none",
            backgroundColor: "#e96b8a",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
