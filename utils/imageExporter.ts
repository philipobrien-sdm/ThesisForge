
import { SESAR_LOGO_STRING } from '../components/SesarLogo';

// Helper to serialize SVG and render to canvas for high-res export
export const exportSvgToPng = async (
  svgElement: SVGSVGElement,
  contentBounds: { minX: number; maxX: number; minY: number; maxY: number },
  filename: string,
  padding: number = 50
) => {
  try {
    const { toPng } = await import('html-to-image');

    // Calculate dimensions
    const width = contentBounds.maxX - contentBounds.minX + (padding * 2);
    const height = contentBounds.maxY - contentBounds.minY + (padding * 2);
    
    // ViewBox parameters for cropping/framing
    const viewBoxX = contentBounds.minX - padding;
    const viewBoxY = contentBounds.minY - padding;

    const dataUrl = await toPng(svgElement as any as HTMLElement, {
        backgroundColor: '#ffffff',
        width: width,
        height: height,
        style: {
            // Force the element dimensions to match our target export size
            width: `${width}px`,
            height: `${height}px`,
        },
        onClone: (clonedNode) => {
            const svg = clonedNode as SVGSVGElement;
            
            // 1. Set viewBox to frame the content we want
            svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${width} ${height}`);
            // Ensure width/height attributes match to prevent scaling weirdness
            svg.setAttribute('width', `${width}px`);
            svg.setAttribute('height', `${height}px`);
            
            // 2. Inject Watermark (Sesar Logo)
            // We parse the string into a DOM node and append it as a nested SVG
            const parser = new DOMParser();
            const logoDoc = parser.parseFromString(SESAR_LOGO_STRING, "image/svg+xml");
            const logoSvg = logoDoc.documentElement;
            
            if (logoSvg) {
                const logoWidth = 200;
                const logoHeight = 66; // Approx aspect ratio
                // Position relative to the new viewBox
                const logoX = viewBoxX + width - logoWidth - 20; // 20px padding from right
                const logoY = viewBoxY + height - logoHeight - 20; // 20px padding from bottom
                
                logoSvg.setAttribute('x', String(logoX));
                logoSvg.setAttribute('y', String(logoY));
                logoSvg.setAttribute('width', String(logoWidth));
                logoSvg.setAttribute('height', String(logoHeight));
                logoSvg.setAttribute('opacity', '0.5');
                
                // Add styling to ensure it sits on top if needed, though appendChild usually does that for SVG z-order
                logoSvg.style.pointerEvents = 'none';
                
                svg.appendChild(logoSvg);
            }
        }
    });

    // Trigger Download
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error('Export failed:', error);
    alert('Failed to generate image. Browser security restrictions may prevent exporting tainted content (e.g. external images).');
  }
};
