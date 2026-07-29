import "./relume.css";
import "./landing-theme.css";

export default function LandingTestVersion1Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="landing-rebrand">{children}</div>;
}
