import { AudioWaveRibbon } from "./audio-wave-ribbon";

export default {
  title: "Components/audio-wave-ribbon",
};

export const Idle = {
  render: () => <AudioWaveRibbon height={126} />,
};

export const Active = {
  render: () => <AudioWaveRibbon active audioLevel={0.42} height={126} />,
};
