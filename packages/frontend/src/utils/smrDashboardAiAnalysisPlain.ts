// SMR-START
export const stripCommonMarkdownLeaks = (text: string): string => {
    let out = text;
    out = out.replace(/```[\s\S]*?```/g, '');
    out = out.replace(/^\s*#{1,6}\s+/gm, '');
    out = out.replace(/\*\*([^*]+)\*\*/g, '$1');
    out = out.replace(/__([^_]+)__/g, '$1');
    out = out.replace(/(?<=\n|^)\s*[-*]\s+/gm, '');
    return out;
};
// SMR-END
