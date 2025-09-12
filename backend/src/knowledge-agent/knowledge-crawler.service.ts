import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class KnowledgeCrawlerService {
  private readonly logger = new Logger(KnowledgeCrawlerService.name);
  private visitedUrls = new Set<string>();
  private baseUrl: string;
  private maxPages = 50; // Limit the number of pages to crawl
  private pageCount = 0;

  /**
   * Crawls a website starting from the base URL and collects content from pages
   * @param baseUrl The starting URL for the crawler
   * @returns Array of objects with url and content properties
   */
  async crawlWebsite(baseUrl: string): Promise<Array<{ url: string; content: string; title: string }>> {
    this.logger.log(`Starting crawl of ${baseUrl}`);
    this.visitedUrls.clear();
    this.pageCount = 0;
    this.baseUrl = new URL(baseUrl).origin;
    
    const results: Array<{ url: string; content: string; title: string }> = [];
    await this.crawlPage(baseUrl, results);
    
    this.logger.log(`Crawl completed. Collected content from ${results.length} pages`);
    return results;
  }

  /**
   * Recursively crawls pages starting from the given URL
   */
  private async crawlPage(
    url: string, 
    results: Array<{ url: string; content: string; title: string }>
  ): Promise<void> {
    // Check if we've reached the page limit or already visited this URL
    if (this.pageCount >= this.maxPages || this.visitedUrls.has(url)) {
      return;
    }

    this.visitedUrls.add(url);
    this.pageCount++;
    
    try {
      this.logger.log(`Crawling page ${this.pageCount}: ${url}`);
      
      // Fetch the page content
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 10000,
      });
      
      const $ = cheerio.load(response.data);
      
      // Extract the main content
      // Target specific elements that are likely to contain the main content
      const contentSelectors = [
        'article', '.article-content', '.article-body', 
        '.documentation', '.knowledge-base', '.help-content',
        '.main-content', 'main', '.content'
      ];
      
      let contentHtml = '';
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          contentHtml = element.html() || '';
          break;
        }
      }
      
      // If no specific content container found, use the body
      if (!contentHtml) {
        contentHtml = $('body').html() || '';
      }
      
      // Clean the HTML content
      const content = this.cleanHtml(contentHtml);
      const title = $('title').text().trim();
      
      // Only add pages with meaningful content
      if (content.length > 100) {
        results.push({ url, content, title });
        this.logger.log(`Added content from ${url}, length: ${content.length} characters`);
      }
      
      // Find links to other pages on the same domain
      const links = $('a[href]')
        .map((_, element) => {
          const href = $(element).attr('href');
          if (!href) return null;
          
          try {
            // Handle relative URLs
            const absoluteUrl = new URL(href, url).href;
            const linkUrl = new URL(absoluteUrl);
            
            // Only follow links to the same domain and that are HTML pages
            if (linkUrl.origin === this.baseUrl && 
                !absoluteUrl.includes('#') && 
                !absoluteUrl.endsWith('.pdf') && 
                !absoluteUrl.endsWith('.jpg') && 
                !absoluteUrl.endsWith('.png') && 
                !absoluteUrl.endsWith('.gif')) {
              return absoluteUrl;
            }
          } catch (e) {
            // Invalid URL, ignore
          }
          return null;
        })
        .get()
        .filter(Boolean);
      
      // Recursively crawl linked pages
      for (const link of links) {
        if (link && !this.visitedUrls.has(link)) {
          await this.crawlPage(link, results);
        }
      }
      
    } catch (error) {
      this.logger.error(`Error crawling ${url}: ${error.message}`);
    }
  }
  
  /**
   * Cleans HTML content by removing scripts, styles, and unnecessary elements
   */
  private cleanHtml(html: string): string {
    const $ = cheerio.load(html);
    
    // Remove scripts, styles, and other non-content elements
    $('script, style, meta, link, noscript, iframe, svg, img').remove();
    
    // Get text content and clean it up
    let text = $.text();
    
    // Remove excessive whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }
}
