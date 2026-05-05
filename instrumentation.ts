export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNodeJs } = await import("./instrumentation.node");
    registerNodeJs();
  }
}
