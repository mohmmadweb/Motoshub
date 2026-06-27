type Props = {
  name: string;
  color?: string;
  size?: number;
  online?: boolean;
};

export default function Avatar({ name, color = "#6c5ce7", size = 40, online }: Props) {
  const initials = name.trim().slice(0, 1);
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        className="flex items-center justify-center w-full h-full rounded-full text-white font-bold"
        style={{ backgroundColor: color, fontSize: size * 0.4 }}
      >
        {initials}
      </span>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 left-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            online ? "bg-emerald-500" : "bg-ink-300"
          }`}
        />
      )}
    </span>
  );
}
