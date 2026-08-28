declare module "html2pdf.js" {
    interface Html2PdfOptions {
        margin?: number | number[];
        filename?: string;
        image?: { type?: string; quality?: number };
        html2canvas?: { scale?: number; useCORS?: boolean;[key: string]: any };
        jsPDF?: { unit?: string; format?: string; orientation?: string;[key: string]: any };
    }

    interface Html2PdfWorker {
        set(opt: Html2PdfOptions): Html2PdfWorker;
        from(element: HTMLElement | string): Html2PdfWorker;
        save(): Promise<void>;
        output(type: string, options?: string): Promise<any>;
        [key: string]: any;
    }

    function html2pdf(): Html2PdfWorker;
    export default html2pdf;
}
