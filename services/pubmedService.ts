import { Paper } from '../types';

const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

// Helper to delay requests to respect rate limits (3 requests/second)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const searchPubMed = async (query: string, maxResults: number = 10): Promise<Paper[]> => {
  try {
    // 1. Search for IDs
    const searchUrl = `${PUBMED_API_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=${maxResults}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.esearchresult || !searchData.esearchresult.idlist.length) {
      return [];
    }

    const ids = searchData.esearchresult.idlist;
    
    // Respect rate limit slightly
    await delay(350); 

    // 2. Fetch Details
    const summaryUrl = `${PUBMED_API_BASE}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
    const summaryRes = await fetch(summaryUrl);
    const summaryData = await summaryRes.json();
    
    const papers: Paper[] = [];
    const resultData = summaryData.result;

    // 3. Need abstract separately or use efetch. For this demo, we try to mock or fetch if possible.
    // Esummary gives titles/authors but often not abstracts. 
    // We will do a basic fetch. In a prod app, we'd use efetch which returns XML.
    
    // Let's do a simplified EFetch for XML to get abstracts.
    await delay(350);
    const fetchUrl = `${PUBMED_API_BASE}/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`;
    const fetchRes = await fetch(fetchUrl);
    const textData = await fetchRes.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(textData, "text/xml");
    const articles = xmlDoc.getElementsByTagName("PubmedArticle");

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const medline = article.getElementsByTagName("MedlineCitation")[0];
      const articleData = medline.getElementsByTagName("Article")[0];
      
      const pmid = medline.getElementsByTagName("PMID")[0]?.textContent || ids[i];
      const title = articleData.getElementsByTagName("ArticleTitle")[0]?.textContent || "No Title";
      
      const abstractList = articleData.getElementsByTagName("AbstractText");
      let abstract = "";
      for (let j = 0; j < abstractList.length; j++) {
        abstract += abstractList[j].textContent + " ";
      }

      const authorList = articleData.getElementsByTagName("Author");
      const authors: string[] = [];
      for(let j=0; j<authorList.length; j++) {
        const lastName = authorList[j].getElementsByTagName("LastName")[0]?.textContent;
        const initials = authorList[j].getElementsByTagName("Initials")[0]?.textContent;
        if(lastName) authors.push(`${lastName} ${initials || ''}`);
      }

      const journal = articleData.getElementsByTagName("Title")[0]?.textContent || "Unknown Journal";
      const pubDate = articleData.getElementsByTagName("PubDate")[0]?.textContent || "Unknown Date";
      
      papers.push({
        id: pmid,
        title,
        abstract: abstract.trim() || "No abstract available.",
        authors,
        year: pubDate, // Simplified
        journal,
        source: 'PubMed',
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        selected: false
      });
    }

    return papers;

  } catch (error) {
    console.error("PubMed Search Error:", error);
    return [];
  }
};
