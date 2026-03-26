import React from "react";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

type VidaEmOrdemLogoProps = {
  size?: number;
  withContainer?: boolean;
  blueprintOpacity?: number;
};

export default function VidaEmOrdemLogo({
  size = 164,
  withContainer = true,
  blueprintOpacity = 1,
}: VidaEmOrdemLogoProps) {
  const outerSize = size;
  const iconPadding = withContainer ? outerSize * 0.08 : 0;
  const contentSize = withContainer ? outerSize - iconPadding * 2 : outerSize;
  const offset = withContainer ? iconPadding : 0;

  const pathD = `
    M ${offset + contentSize * 0.24} ${offset + contentSize * 0.74}
    L ${offset + contentSize * 0.5} ${offset + contentSize * 0.22}
    L ${offset + contentSize * 0.76} ${offset + contentSize * 0.74}
  `;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <Defs>
        <LinearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F7FCFF" />
          <Stop offset="1" stopColor="#DDEFFF" />
        </LinearGradient>
        <LinearGradient id="logo-stroke" x1="0.15" y1="0.16" x2="0.86" y2="0.88">
          <Stop offset="0" stopColor="#89D0FF" />
          <Stop offset="0.34" stopColor="#3EA1FF" />
          <Stop offset="0.72" stopColor="#1777E2" />
          <Stop offset="1" stopColor="#0E5CC8" />
        </LinearGradient>
        <LinearGradient id="logo-highlight" x1="0.1" y1="0.1" x2="0.7" y2="0.94">
          <Stop offset="0" stopColor="rgba(255,255,255,0.92)" />
          <Stop offset="0.44" stopColor="rgba(255,255,255,0.38)" />
          <Stop offset="1" stopColor="rgba(255,255,255,0)" />
        </LinearGradient>
      </Defs>

      {withContainer ? (
        <Rect
          x={0}
          y={0}
          width={size}
          height={size}
          rx={size * 0.17}
          fill="url(#logo-bg)"
        />
      ) : null}

      <G opacity={blueprintOpacity}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.36}
          stroke="rgba(89,167,230,0.28)"
          strokeWidth={1.2}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.22}
          stroke="rgba(89,167,230,0.2)"
          strokeWidth={1}
        />
        <Line
          x1={size / 2}
          y1={size * 0.08}
          x2={size / 2}
          y2={size * 0.92}
          stroke="rgba(89,167,230,0.28)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
        <Line
          x1={size * 0.08}
          y1={size * 0.72}
          x2={size * 0.92}
          y2={size * 0.72}
          stroke="rgba(89,167,230,0.24)"
          strokeWidth={1}
        />
        <Line
          x1={size * 0.18}
          y1={size * 0.92}
          x2={size / 2}
          y2={size * 0.08}
          stroke="rgba(89,167,230,0.2)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <Line
          x1={size * 0.82}
          y1={size * 0.92}
          x2={size / 2}
          y2={size * 0.08}
          stroke="rgba(89,167,230,0.2)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      </G>

      <Path
        d={pathD}
        stroke="rgba(14,92,200,0.1)"
        strokeWidth={size * 0.23}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`translate(0 ${size * 0.02})`}
      />

      <Path
        d={pathD}
        stroke="url(#logo-stroke)"
        strokeWidth={size * 0.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <Path
        d={pathD}
        stroke="url(#logo-highlight)"
        strokeWidth={size * 0.07}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`translate(${-size * 0.008} ${-size * 0.012})`}
        opacity={0.86}
      />

      <Circle
        cx={size / 2}
        cy={size * 0.44}
        r={size * 0.018}
        fill="rgba(255,255,255,0.45)"
      />
    </Svg>
  );
}
