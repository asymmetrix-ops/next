export default function SubstackSubscribeWidget() {
  return (
    <div className="landing-panel min-w-0 max-w-full overflow-hidden rounded-2xl">
      <iframe
        src="https://asymmetrixintelligence.substack.com/embed"
        width="100%"
        height="400"
        className="block max-w-full"
        style={{ border: "none", background: "white" }}
        scrolling="no"
        title="Subscribe to Asymmetrix on Substack"
      />
    </div>
  );
}
