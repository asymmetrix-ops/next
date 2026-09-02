export default function SubstackSubscribeWidget() {
  return (
    <div className="landing-panel overflow-hidden rounded-2xl">
      <iframe
        src="https://asymmetrixintelligence.substack.com/embed"
        width="100%"
        height="320"
        style={{ border: "none", background: "white" }}
        scrolling="no"
        title="Subscribe to Asymmetrix on Substack"
      />
    </div>
  );
}
