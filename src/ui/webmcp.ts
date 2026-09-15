interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
}
interface Context {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
}
export function registerStudioTools(
  read: () => object,
  setEffect: (effect: string) => void,
) {
  const context = (document as Document & { modelContext?: Context })
    .modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const tools: Tool[] = [
    {
      name: "read_light_field",
      description:
        "Read current input mode, gesture, camera status and quality. Returns no video or hand landmarks.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => read(),
    },
    {
      name: "set_light_field_demo",
      description:
        "Switch to mouse demonstration and set the light effect. Stops an active camera; does not enable a camera.",
      inputSchema: {
        type: "object",
        properties: {
          effect: {
            type: "string",
            enum: ["follow", "attract", "scatter", "wave"],
          },
        },
        required: ["effect"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: (input) => {
        if (
          !input ||
          typeof input !== "object" ||
          !("effect" in input) ||
          Object.keys(input).length !== 1 ||
          typeof input.effect !== "string" ||
          !["follow", "attract", "scatter", "wave"].includes(input.effect)
        )
          throw Error("Invalid effect");
        setEffect(input.effect);
        return read();
      },
    },
  ];
  for (const tool of tools)
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {
      /* Optional capability; ordinary browsers continue normally. */
    }
  return () => lifecycle.abort();
}
