// Inline SVG low-poly dark geometric wallpaper — no external assets needed.
// Tiles seamlessly as a background pattern in the chat thread pane.

const ChatWallpaper = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="600"
        height="600"
        viewBox="0 0 600 600"
        style={{ display: 'none' }}
    >
        <defs>
            <symbol id="synapse-chat-wallpaper" viewBox="0 0 600 600">
                {/* Base */}
                <rect width="600" height="600" fill="#0a0a0a" />

                {/* Polygon faces — varying shades of near-black dark gray */}
                <polygon points="0,0 120,0 60,90"          fill="#111111" />
                <polygon points="120,0 240,0 180,80"        fill="#0d0d0d" />
                <polygon points="240,0 360,0 300,100"       fill="#131313" />
                <polygon points="360,0 480,0 420,85"        fill="#0f0f0f" />
                <polygon points="480,0 600,0 540,90"        fill="#121212" />
                <polygon points="600,0 600,120 540,90"      fill="#0e0e0e" />

                <polygon points="0,0 60,90 0,150"           fill="#0f0f0f" />
                <polygon points="60,90 120,0 180,80"        fill="#161616" />
                <polygon points="60,90 180,80 150,170"      fill="#111111" />
                <polygon points="120,0 240,0 180,80"        fill="#0d0d0d" />
                <polygon points="180,80 240,0 300,100"      fill="#141414" />
                <polygon points="180,80 300,100 260,180"    fill="#0f0f0f" />
                <polygon points="240,0 360,0 300,100"       fill="#131313" />
                <polygon points="300,100 360,0 420,85"      fill="#101010" />
                <polygon points="300,100 420,85 380,190"    fill="#161616" />
                <polygon points="360,0 480,0 420,85"        fill="#0f0f0f" />
                <polygon points="420,85 480,0 540,90"       fill="#131313" />
                <polygon points="420,85 540,90 500,180"     fill="#0d0d0d" />
                <polygon points="480,0 600,0 540,90"        fill="#121212" />
                <polygon points="540,90 600,0 600,120"      fill="#161616" />
                <polygon points="540,90 600,120 580,200"    fill="#111111" />

                <polygon points="0,150 60,90 150,170"       fill="#131313" />
                <polygon points="0,150 150,170 80,250"      fill="#0e0e0e" />
                <polygon points="60,90 150,170 180,80"      fill="#161616" />  {/* lighter face */}
                <polygon points="150,170 180,80 260,180"    fill="#111111" />
                <polygon points="150,170 260,180 200,270"   fill="#141414" />
                <polygon points="180,80 260,180 300,100"    fill="#0f0f0f" />
                <polygon points="260,180 300,100 380,190"   fill="#131313" />
                <polygon points="260,180 380,190 320,280"   fill="#101010" />
                <polygon points="300,100 380,190 420,85"    fill="#161616" />
                <polygon points="380,190 420,85 500,180"    fill="#111111" />
                <polygon points="380,190 500,180 440,270"   fill="#141414" />
                <polygon points="420,85 500,180 540,90"     fill="#0d0d0d" />
                <polygon points="500,180 540,90 580,200"    fill="#131313" />
                <polygon points="500,180 580,200 560,290"   fill="#161616" />
                <polygon points="540,90 580,200 600,120"    fill="#0f0f0f" />
                <polygon points="580,200 600,120 600,280"   fill="#111111" />

                <polygon points="0,250 80,250 30,340"       fill="#161616" />
                <polygon points="80,250 150,170 200,270"    fill="#0f0f0f" />
                <polygon points="80,250 200,270 130,360"    fill="#131313" />
                <polygon points="150,170 200,270 260,180"   fill="#111111" />
                <polygon points="200,270 260,180 320,280"   fill="#141414" />
                <polygon points="200,270 320,280 250,370"   fill="#0d0d0d" />
                <polygon points="260,180 320,280 380,190"   fill="#161616" />
                <polygon points="320,280 380,190 440,270"   fill="#111111" />
                <polygon points="320,280 440,270 370,360"   fill="#131313" />
                <polygon points="380,190 440,270 500,180"   fill="#0f0f0f" />
                <polygon points="440,270 500,180 560,290"   fill="#141414" />
                <polygon points="440,270 560,290 490,370"   fill="#161616" />
                <polygon points="500,180 560,290 580,200"   fill="#0e0e0e" />
                <polygon points="560,290 580,200 600,280"   fill="#131313" />
                <polygon points="560,290 600,280 600,380"   fill="#111111" />

                <polygon points="0,340 30,340 0,430"        fill="#131313" />
                <polygon points="30,340 80,250 130,360"     fill="#161616" />
                <polygon points="30,340 130,360 70,450"     fill="#0f0f0f" />
                <polygon points="130,360 200,270 250,370"   fill="#141414" />
                <polygon points="130,360 250,370 180,460"   fill="#111111" />
                <polygon points="200,270 250,370 320,280"   fill="#0d0d0d" />
                <polygon points="250,370 320,280 370,360"   fill="#161616" />
                <polygon points="250,370 370,360 300,460"   fill="#131313" />
                <polygon points="320,280 370,360 440,270"   fill="#111111" />
                <polygon points="370,360 440,270 490,370"   fill="#0f0f0f" />
                <polygon points="370,360 490,370 420,460"   fill="#141414" />
                <polygon points="440,270 490,370 560,290"   fill="#161616" />
                <polygon points="490,370 560,290 530,460"   fill="#0e0e0e" />
                <polygon points="490,370 530,460 600,450"   fill="#131313" />
                <polygon points="560,290 600,380 600,450"   fill="#111111" />
                <polygon points="560,290 530,460 600,450"   fill="#161616" />

                <polygon points="0,430 70,450 20,530"       fill="#111111" />
                <polygon points="70,450 130,360 180,460"    fill="#141414" />
                <polygon points="70,450 180,460 110,540"    fill="#161616" />
                <polygon points="180,460 250,370 300,460"   fill="#0f0f0f" />
                <polygon points="180,460 300,460 230,550"   fill="#131313" />
                <polygon points="300,460 370,360 420,460"   fill="#111111" />
                <polygon points="300,460 420,460 350,550"   fill="#0d0d0d" />
                <polygon points="420,460 490,370 530,460"   fill="#161616" />
                <polygon points="420,460 530,460 470,550"   fill="#141414" />
                <polygon points="530,460 600,450 570,540"   fill="#111111" />

                <polygon points="0,530 20,530 0,600"        fill="#131313" />
                <polygon points="20,530 110,540 60,600"     fill="#0f0f0f" />
                <polygon points="110,540 180,460 230,550"   fill="#161616" />
                <polygon points="110,540 230,550 170,600"   fill="#111111" />
                <polygon points="230,550 300,460 350,550"   fill="#141414" />
                <polygon points="230,550 350,550 280,600"   fill="#0d0d0d" />
                <polygon points="350,550 420,460 470,550"   fill="#161616" />
                <polygon points="350,550 470,550 400,600"   fill="#131313" />
                <polygon points="470,550 530,460 570,540"   fill="#111111" />
                <polygon points="470,550 570,540 510,600"   fill="#141414" />
                <polygon points="570,540 600,450 600,600"   fill="#161616" />
                <polygon points="570,540 600,600 510,600"   fill="#0f0f0f" />

                {/* Edge lines to give the 3D raised polygon look */}
                <g stroke="#1a1a1a" strokeWidth="0.6" fill="none" opacity="0.8">
                    <line x1="60"  y1="90"  x2="120" y2="0"   />
                    <line x1="60"  y1="90"  x2="0"   y2="150" />
                    <line x1="60"  y1="90"  x2="180" y2="80"  />
                    <line x1="60"  y1="90"  x2="150" y2="170" />
                    <line x1="180" y1="80"  x2="300" y2="100" />
                    <line x1="180" y1="80"  x2="260" y2="180" />
                    <line x1="300" y1="100" x2="420" y2="85"  />
                    <line x1="300" y1="100" x2="380" y2="190" />
                    <line x1="420" y1="85"  x2="540" y2="90"  />
                    <line x1="420" y1="85"  x2="500" y2="180" />
                    <line x1="540" y1="90"  x2="580" y2="200" />
                    <line x1="150" y1="170" x2="260" y2="180" />
                    <line x1="150" y1="170" x2="80"  y2="250" />
                    <line x1="260" y1="180" x2="380" y2="190" />
                    <line x1="260" y1="180" x2="200" y2="270" />
                    <line x1="380" y1="190" x2="500" y2="180" />
                    <line x1="380" y1="190" x2="320" y2="280" />
                    <line x1="500" y1="180" x2="560" y2="290" />
                    <line x1="500" y1="180" x2="440" y2="270" />
                    <line x1="80"  y1="250" x2="200" y2="270" />
                    <line x1="80"  y1="250" x2="30"  y2="340" />
                    <line x1="200" y1="270" x2="320" y2="280" />
                    <line x1="200" y1="270" x2="130" y2="360" />
                    <line x1="320" y1="280" x2="440" y2="270" />
                    <line x1="320" y1="280" x2="250" y2="370" />
                    <line x1="440" y1="270" x2="560" y2="290" />
                    <line x1="440" y1="270" x2="370" y2="360" />
                    <line x1="560" y1="290" x2="490" y2="370" />
                    <line x1="30"  y1="340" x2="130" y2="360" />
                    <line x1="30"  y1="340" x2="70"  y2="450" />
                    <line x1="130" y1="360" x2="250" y2="370" />
                    <line x1="130" y1="360" x2="180" y2="460" />
                    <line x1="250" y1="370" x2="370" y2="360" />
                    <line x1="250" y1="370" x2="300" y2="460" />
                    <line x1="370" y1="360" x2="490" y2="370" />
                    <line x1="370" y1="360" x2="420" y2="460" />
                    <line x1="490" y1="370" x2="530" y2="460" />
                    <line x1="70"  y1="450" x2="180" y2="460" />
                    <line x1="70"  y1="450" x2="110" y2="540" />
                    <line x1="180" y1="460" x2="300" y2="460" />
                    <line x1="180" y1="460" x2="230" y2="550" />
                    <line x1="300" y1="460" x2="420" y2="460" />
                    <line x1="300" y1="460" x2="350" y2="550" />
                    <line x1="420" y1="460" x2="530" y2="460" />
                    <line x1="420" y1="460" x2="470" y2="550" />
                    <line x1="530" y1="460" x2="570" y2="540" />
                    <line x1="110" y1="540" x2="230" y2="550" />
                    <line x1="230" y1="550" x2="350" y2="550" />
                    <line x1="350" y1="550" x2="470" y2="550" />
                    <line x1="470" y1="550" x2="570" y2="540" />
                </g>

                {/* Very subtle highlight edges — simulates raised 3D faces */}
                <g stroke="#252525" strokeWidth="0.4" fill="none" opacity="0.5">
                    <line x1="60"  y1="90"  x2="150" y2="170" />
                    <line x1="180" y1="80"  x2="150" y2="170" />
                    <line x1="300" y1="100" x2="260" y2="180" />
                    <line x1="420" y1="85"  x2="380" y2="190" />
                    <line x1="540" y1="90"  x2="500" y2="180" />
                    <line x1="80"  y1="250" x2="130" y2="360" />
                    <line x1="200" y1="270" x2="250" y2="370" />
                    <line x1="320" y1="280" x2="370" y2="360" />
                    <line x1="440" y1="270" x2="490" y2="370" />
                </g>
            </symbol>
        </defs>
    </svg>
);

export default ChatWallpaper;
