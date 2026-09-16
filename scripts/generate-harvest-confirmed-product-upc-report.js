require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');
const { loadHarvestConfirmedCatalog } = require('../services/harvestConfirmedCatalog');

function escapeMarkdown(value) {
    return String(value ?? '')
        .replace(/\|/g, '\\|')
        .replace(/\r?\n/g, ' ')
        .trim();
}

function formatNumber(value) {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    return String(value);
}

async function run() {
    const reportDir = path.join(__dirname, '../reports');
    const reportPath = path.join(reportDir, 'harvest-confirmed-product-upc-report.md');

    await fs.mkdir(reportDir, { recursive: true });

    const catalog = await loadHarvestConfirmedCatalog({ forceReload: true });
    const lines = [];

    lines.push('# Harvest Confirmed Product and UPC Report');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('## Overview');
    lines.push('');
    lines.push(`- PDFs scanned: ${catalog.pdfFiles.length}`);
    lines.push(`- PDFs with parsed line items: ${catalog.docsWithItems.length}`);
    lines.push(`- Total extracted line items: ${catalog.totalRows}`);
    lines.push(`- Unique product/UPC/SKU combinations: ${catalog.uniqueItems}`);
    lines.push(`- Unique UPCs: ${catalog.uniqueUpcs}`);
    lines.push(`- Parse errors: ${catalog.parseErrors.length}`);
    lines.push('');

    lines.push('## Manual Review Queue');
    lines.push('');
    lines.push('Use these clusters first when matching by description. The goal is to confirm the same product even when UPC or SKU formatting varies across documents.');
    lines.push('');

    lines.push('### Same Description, Multiple UPCs');
    lines.push('');
    if (!catalog.descriptionReviewQueue || catalog.descriptionReviewQueue.length === 0) {
        lines.push('- None found.');
        lines.push('');
    } else {
        lines.push('| Description | Count | Unique UPCs | Unique SKUs | Example POs | Source Files |');
        lines.push('| --- | ---: | ---: | ---: | --- | --- |');
        catalog.descriptionReviewQueue.slice(0, 100).forEach(group => {
            lines.push(`| ${escapeMarkdown(group.description || '(no description)')} | ${group.count} | ${group.upcs.size} | ${group.skus.size} | ${escapeMarkdown([...group.poNumbers].sort().join(', '))} | ${escapeMarkdown([...group.files].sort().join(', '))} |`);
        });
        lines.push('');
    }

    lines.push('### Same UPC, Multiple Descriptions');
    lines.push('');
    if (!catalog.upcReviewQueue || catalog.upcReviewQueue.length === 0) {
        lines.push('- None found.');
        lines.push('');
    } else {
        lines.push('| UPC | Count | Unique Descriptions | Unique SKUs | Example POs | Source Files |');
        lines.push('| --- | ---: | ---: | ---: | --- | --- |');
        catalog.upcReviewQueue.slice(0, 100).forEach(group => {
            lines.push(`| ${escapeMarkdown(group.upc || '')} | ${group.count} | ${group.descriptionSet.size} | ${group.skuSet.size} | ${escapeMarkdown([...group.poNumbers].sort().join(', '))} | ${escapeMarkdown([...group.files].sort().join(', '))} |`);
        });
        lines.push('');
    }

    lines.push('### Same SKU, Multiple UPCs');
    lines.push('');
    if (!catalog.skuReviewQueue || catalog.skuReviewQueue.length === 0) {
        lines.push('- None found.');
        lines.push('');
    } else {
        lines.push('| SKU | Count | Unique UPCs | Unique Descriptions | Example POs | Source Files |');
        lines.push('| --- | ---: | ---: | ---: | --- | --- |');
        catalog.skuReviewQueue.slice(0, 100).forEach(group => {
            lines.push(`| ${escapeMarkdown(group.sku || '')} | ${group.count} | ${group.upcs.size} | ${group.descriptions.size} | ${escapeMarkdown([...group.poNumbers].sort().join(', '))} | ${escapeMarkdown([...group.files].sort().join(', '))} |`);
        });
        lines.push('');
    }

    if (catalog.parseErrors.length > 0) {
        lines.push('## Parse Errors');
        lines.push('');
        catalog.parseErrors.forEach(item => {
            lines.push(`- ${escapeMarkdown(item.fileName)}: ${escapeMarkdown(item.error)}`);
        });
        lines.push('');
    }

    lines.push('## Confirmed Product / UPC Rows');
    lines.push('');
    lines.push('| Product / Description | UPC | SKU | PO Numbers | Count | Source Files | Qty | UOM | Retail Price | Unit Price |');
    lines.push('| --- | --- | --- | --- | ---: | --- | ---: | --- | ---: | ---: |');

    catalog.confirmedRows.forEach(row => {
        const poNumbers = [...row.poNumbers].sort().join(', ');
        const files = [...row.files].sort().join(', ');
        const sampleRow = row.rows && row.rows.length > 0 ? row.rows[0] : {};
        lines.push(
            `| ${escapeMarkdown(row.description || row.product || row.sku || '')} | ${escapeMarkdown(row.upc)} | ${escapeMarkdown(row.sku)} | ${escapeMarkdown(poNumbers)} | ${row.count || 0} | ${escapeMarkdown(files)} | ${formatNumber(sampleRow.quantity)} | ${escapeMarkdown(sampleRow.qtyUom)} | ${formatNumber(sampleRow.retailPrice)} | ${formatNumber(sampleRow.unitPrice)} |`
        );
    });

    lines.push('');
    lines.push('## Source Documents With Parsed Items');
    lines.push('');
    lines.push('| Source File | PO Number | Vendor | Line Items |');
    lines.push('| --- | --- | --- | ---: |');
    catalog.docsWithItems
        .sort((a, b) => a.fileName.localeCompare(b.fileName))
        .forEach(doc => {
            lines.push(`| ${escapeMarkdown(doc.fileName)} | ${escapeMarkdown(doc.poNumber)} | ${escapeMarkdown(doc.vendor)} | ${doc.lineItemCount} |`);
        });
    lines.push('');

    await fs.writeFile(reportPath, `${lines.join('\n')}\n`, 'utf8');

    console.log(`Wrote report to ${reportPath}`);
    console.log(`Scanned ${catalog.pdfFiles.length} PDFs, extracted ${catalog.totalRows} line items, found ${catalog.uniqueItems} unique product/UPC/SKU combinations.`);
}

run().catch(async error => {
    console.error(error);
    process.exitCode = 1;
});
