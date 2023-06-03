import { useFrame } from '@/hooks/useFrames';

export default function Filters() {
    const [frame] = useFrame(10);

    return <>
        <svg style={{ display: 'none' }}>
            <filter id="abberation">
                <feOffset
                    dx={-1}
                    dy={-1}
                    in="SourceGraphic"
                    result="cyan" />
                <feOffset
                    dx={0}
                    dy={0}
                    in="SourceGraphic"
                    result="magenta" />
                <feOffset
                    dx={2}
                    dy={2}
                    in="SourceGraphic"
                    result="yellow" />
                <feColorMatrix
                    in="cyan"
                    values="1 0 0 0 0
                            0 0 0 0 1
                            0 0 0 0 1
                            0 0 0 1 0"
                    result="cyan" />
                <feColorMatrix
                    in="magenta"
                    values="0 0 0 0 1
                            0 1 0 0 0
                            0 0 0 0 1
                            0 0 0 1 0"
                    result="magenta" />
                <feColorMatrix
                    in="yellow"
                    values="0 0 0 0 1
                            0 0 0 0 1
                            0 0 1 0 0
                            0 0 0 1 0"
                    result="yellow" />
                <feBlend
                    mode="multiply"
                    in="cyan"
                    in2="magenta"
                    result="preYellow" />
                <feBlend
                    mode="multiply"
                    in="yellow"
                    in2="preYellow"
                    result="final" />
                <feColorMatrix
                    in="final"
                    values="1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 0.1 0"
                    result="final"
                />
                <feBlend
                    mode="color-dodge"
                    in="SourceGraphic"
                    in2="final" />
            </filter>

            <filter id="bloom">
                <feGaussianBlur in="SourceGraphic" stdDeviation="40" />
                <feColorMatrix type="saturate" values="3"/>
                <feColorMatrix
                    values="1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 0.4 0"
                />
                <feBlend mode="screen" in2="SourceGraphic" />
            </filter>
            <filter id="shadow">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                <feColorMatrix
                    values="1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 0.4 0"
                />
                <feBlend mode="multiply" in2="SourceGraphic" />
            </filter>

            <filter id="wobble">
                <feTurbulence
                    type="fractalNoise"
                    baseFrequency={0.1}
                    numOctaves={1}
                    seed={Math.floor(frame/2)*10}
                    stitchTiles="stitch"
                    result="noise"
                />
                <feDisplacementMap
                    in2="noise"
                    in="SourceGraphic"
                    scale="3"
                    xChannelSelector="R"
                    yChannelSelector="G" />
                <feBlend mode="normal" in2="SourceGraphic" />
            </filter>
            <filter id="grain">
                <feTurbulence
                    type="fractalNoise"
                    baseFrequency={0.4}
                    numOctaves={4}
                    seed={frame*10}
                    stitchTiles="stitch"
                />
                <feColorMatrix
                    values="1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 0.1 0"
                />
                <feBlend mode="overlay" in2="SourceGraphic" />
            </filter>
            <filter id="dynamicValue">
                <feColorMatrix
                    values="0 0 0 0.247 0
                            0 0 0 0.636 0
                            0 0 0 0.451 0
                            0 0 0 1 0"
                    in="SourceGraphic"
                />
            </filter>
            <filter id="warningValue">
                <feColorMatrix
                    values="0 0 0 0.68 0
                            0 0 0 0.24 0
                            0 0 0 0.18 0
                            0 0 0 0.9 0"
                    in="SourceGraphic"
                />
            </filter>
        </svg>
        <div style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(to bottom, rgba(0, 0, 0, .1) 50%, transparent 60%)',
            backgroundSize: '100% 2em',
            zIndex: 100,
        }}/>
    </>;
}
