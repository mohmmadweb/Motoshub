import { Sprout, Library, Building2, Rocket, GraduationCap, Globe, Factory, HeartPulse, Cpu, Briefcase, Droplets, Landmark, type LucideProps } from "lucide-react";

const icons = { Sprout, Library, Building2, Rocket, GraduationCap, Globe, Factory, HeartPulse, Cpu, Briefcase, Droplets, Landmark };
export const projectIconNames = Object.keys(icons) as (keyof typeof icons)[];
export const projectColors = ["#1f4f99", "#059669", "#dc2626", "#d97706", "#7c3aed", "#0d9488", "#db2777", "#0f172a"];

export function ProjectIcon({ name, ...rest }: { name: string } & LucideProps) {
  const Icon = icons[name as keyof typeof icons] ?? Briefcase;
  return <Icon {...rest} />;
}
