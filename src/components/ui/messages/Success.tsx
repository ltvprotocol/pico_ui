import { MessageIcon, MessageBase, MessageProps} from "@/components/ui";

export function SuccessMessage({ text, className }: MessageProps) {
  return (
    <MessageBase
      text={text}
      className={`bg-green-50 border border-green-200 text-green-700 ${className ?? ""}`}
      icon={<MessageIcon variant="success" />}
    />
  );
}
