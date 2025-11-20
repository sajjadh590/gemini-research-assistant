from Bio import Entrez

# ایمیل خود را اینجا وارد کنید (الزامی برای PubMed)
Entrez.email = "researcher@example.com" 

class PubMedClient:
    def search_articles(self, query, max_results=10):
        try:
            # جستجوی IDها
            handle = Entrez.esearch(db="pubmed", term=query, retmax=max_results, sort="relevance")
            record = Entrez.read(handle)
            handle.close()
            
            id_list = record["IdList"]
            if not id_list: return []
            
            # دریافت جزئیات مقالات
            handle = Entrez.efetch(db="pubmed", id=",".join(id_list), retmode="xml")
            records = Entrez.read(handle)
            handle.close()
            
            results = []
            for paper in records['PubmedArticle']:
                try:
                    art = paper['MedlineCitation']['Article']
                    abstract = ""
                    if 'Abstract' in art:
                        abstract_list = art['Abstract']['AbstractText']
                        abstract = " ".join(abstract_list) if isinstance(abstract_list, list) else str(abstract_list)
                    
                    authors = []
                    if 'AuthorList' in art:
                        for a in art['AuthorList']:
                            if 'LastName' in a:
                                authors.append(f"{a['LastName']} {a.get('Initials', '')}")

                    results.append({
                        "id": str(paper['MedlineCitation']['PMID']),
                        "title": art.get('ArticleTitle', 'No Title'),
                        "abstract": abstract,
                        "authors": authors[:3],
                        "year": art.get('Journal', {}).get('JournalIssue', {}).get('PubDate', {}).get('Year', '2024'),
                        "journal": art.get('Journal', {}).get('Title', 'Unknown'),
                        "source": "PubMed",
                        "url": f"https://pubmed.ncbi.nlm.nih.gov/{paper['MedlineCitation']['PMID']}/",
                        "selected": False
                    })
                except:
                    continue
            return results
        except Exception as e:
            print(f"PubMed Error: {e}")
            return []