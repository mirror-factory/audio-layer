# Agent Builder

Interactive creator for assembling an AI agent with a life-sim style workspace.

## Surface

- Route: `/agent-builder`
- Component: `components/agent-builder.tsx`
- Story: `components/agent-builder.stories.tsx`
- Logic: `lib/agent-builder.ts`

## Behavior

The builder lets users name an agent, choose an archetype, tune autonomy/empathy/speed, pick a workspace, install tools, and review a launch brief. The preview updates immediately so the build process feels direct and spatial rather than form-only.

## Accessibility

All builder choices use native buttons, text inputs, or range inputs. Selected state is exposed with `aria-pressed`, and icon-only visuals are paired with visible labels.
