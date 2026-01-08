import { MessageIcon, MessageBase, MessageProps} from "@/components/ui";

export function ErrorMessage({ text, className }: MessageProps) {
  return (
    <MessageBase
      text={text}
      className={`bg-red-50 border border-red-200 text-red-700 ${className ?? ""}`}
      icon={<MessageIcon variant="error" />}
    />
  );
}
