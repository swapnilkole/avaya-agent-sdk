import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

interface AvayaLogoProps {
  width?: number;
  height?: number;
}

/**
 * AvayaLogo — the same vector path demo-app embeds in its header, rendered through
 * react-native-svg so the mark is identical across web, iOS and Android.
 */
export function AvayaLogo({ width = 88, height = 34 }: AvayaLogoProps) {
  return (
    <Svg width={width} height={height} viewBox="10 5 130 50" accessibilityLabel="Avaya">
      <Path
        d="M87.6718 16.105L96.3928 35.927L105.862 16.105H110.826L93.7918 50.105H89.0318L93.9278 40.823L82.6908 16.105H87.6718ZM121.859 16.105L134.201 40.823H129.22L120.125 21.732L114.413 33.802H122.76L124.12 37.066H112.832L111.047 40.823H106.066L118.408 16.105H121.859ZM27.5938 16.105L39.9358 40.823H34.9718L25.8768 21.732L20.1478 33.802H28.4948L29.8548 37.066H18.5838L16.7818 40.823H11.8008L24.1428 16.105H27.5938ZM74.5478 16.105L86.8898 40.823H81.9088L72.8308 21.732L67.1018 33.802H75.4658L76.8088 37.066H65.5378L63.7358 40.823H58.7548L71.0968 16.105H74.5478ZM40.2588 16.105L49.3538 35.553L58.4488 16.105H63.4298L51.0878 40.823H47.6368L35.2948 16.105H40.2588Z"
        fill={colors.avayaRed}
      />
    </Svg>
  );
}
