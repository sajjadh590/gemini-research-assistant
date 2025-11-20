import React, { useState, useEffect } from 'react';
import { Paper, Language, AnalysisResult } from '../types';
import { searchPubMed } from '../services/pubmedService';
import { analyzePapersForGaps, generateProposal, estimateSampleSizeAI } from '../services/geminiService';
import { Download, Search, BookOpen, FileText, Activity, ChevronRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'search' | 'analysis' | 'proposal' | 'stats'>('search');
  const [language, setLanguage] = useState<Language>(Language.PERSIAN);
  
  // Search State
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Proposal State
  const [proposalTopic, setProposalTopic] = useState('');
  const [proposalStructure, setProposalStructure] = useState('1. Introduction\n2. Literature Review\n3. Methodology\n4. Expected Outcomes');
  const [proposalText, setProposalText] = useState('');
  const [isWriting, setIsWriting] = useState(false);

  // Stats State
  const [statsTopic, setStatsTopic] = useState('');
  const [statsResult, setStatsResult] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  // Handlers
  const handleSearch = async () => {
    if(!query) return;
    setIsSearching(true);
    setPapers([]); // Clear previous
    try {
      const results = await searchPubMed(query);
      setPapers(results);
    } catch (e) {
      alert("Error fetching papers. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const togglePaperSelection = (id: string) => {
    setPapers(papers.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const getSelectedPapers = () => papers.filter(p => p.selected);

  const handleAnalyze = async () => {
    const selected = getSelectedPapers();
    if (selected.length === 0) {
      alert("Please select at least one paper from the Search tab.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await analyzePapersForGaps(selected, language);
      setAnalysisResult(result);
    } catch (e) {
      alert("Analysis failed. Check API limits or try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProposal = async () => {
    const selected = getSelectedPapers();
    if (selected.length === 0) {
        alert("Please select relevant papers in the Search tab to cite.");
        return;
    }
    setIsWriting(true);
    try {
        const result = await generateProposal(proposalTopic, selected, proposalStructure, language);
        setProposalText(result);
    } catch(e) {
        alert("Proposal generation failed.");
    } finally {
        setIsWriting(false);
    }
  };

  const handleStatsAI = async () => {
      if(!statsTopic) return;
      setIsCalculating(true);
      try {
          const res = await estimateSampleSizeAI(statsTopic, language);
          setStatsResult(res);
      } catch(e) {
          alert("Stats estimation failed.");
      } finally {
          setIsCalculating(false);
      }
  };

  // Download Handler
  const downloadTxt = (filename: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
  };

  const isRTL = language === Language.PERSIAN;

  return (
    <div className={`flex h-screen bg-slate-50 ${isRTL ? 'font-persian' : 'font-sans'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-indigo-400 flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> ScholarAI
          </h1>
          <p className="text-xs text-slate-400 mt-1 opacity-70">Automated Research Assistant</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('search')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'search' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Search className="w-5 h-5" />
            <span>{language === Language.PERSIAN ? 'جستجو مقالات' : 'Search Papers'}</span>
          </button>
          <button 
            onClick={() => setActiveTab('analysis')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'analysis' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Activity className="w-5 h-5" />
            <span>{language === Language.PERSIAN ? 'آنالیز و گپ‌ها' : 'Gap Analysis'}</span>
          </button>
          <button 
            onClick={() => setActiveTab('proposal')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'proposal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <FileText className="w-5 h-5" />
            <span>{language === Language.PERSIAN ? 'پروپوزال نویس' : 'Proposal Writer'}</span>
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'stats' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Activity className="w-5 h-5" />
            <span>{language === Language.PERSIAN ? 'دستیار آماری' : 'Statistics Assistant'}</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between bg-slate-800 rounded-lg p-2">
             <span className="text-sm text-slate-300 px-2">Language</span>
             <button 
               onClick={() => setLanguage(l => l === Language.ENGLISH ? Language.PERSIAN : Language.ENGLISH)}
               className="px-3 py-1 text-xs bg-indigo-500 hover:bg-indigo-600 rounded text-white transition-colors"
             >
               {language === Language.ENGLISH ? 'FA' : 'EN'}
             </button>
          </div>
          <div className="mt-4 text-xs text-slate-500 text-center">
            Powered by Google Gemini
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
           <div>
             <h2 className="text-2xl font-bold text-slate-800">
               {activeTab === 'search' && (language === Language.PERSIAN ? 'جستجوی هوشمند منابع' : 'Literature Search')}
               {activeTab === 'analysis' && (language === Language.PERSIAN ? 'تحلیل خودکار و کشف گپ‌های پژوهشی' : 'Automated Gap Analysis')}
               {activeTab === 'proposal' && (language === Language.PERSIAN ? 'نگارش پروپوزال علمی' : 'Proposal Writing')}
               {activeTab === 'stats' && (language === Language.PERSIAN ? 'ابزارهای آماری و متاآنالیز' : 'Statistical Tools & Meta-Analysis')}
             </h2>
             <p className="text-slate-500 text-sm mt-1">
                {language === Language.PERSIAN ? 'از هوش مصنوعی برای تسریع پژوهش خود استفاده کنید' : 'Accelerate your research with Gemini AI'}
             </p>
           </div>
           <div className="flex items-center gap-2">
             <span className={`px-3 py-1 rounded-full text-xs font-medium ${process.env.API_KEY ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
               {process.env.API_KEY ? 'AI Connected' : 'Missing API Key'}
             </span>
           </div>
        </div>

        {/* CONTENT TABS */}

        {/* 1. SEARCH TAB */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder={language === Language.PERSIAN ? 'موضوع تحقیق خود را وارد کنید (مثلا: هوش مصنوعی در پزشکی)...' : 'Enter research topic (e.g. AI in Cardiology)...'}
                  className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button 
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {isSearching ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
                  {language === Language.PERSIAN ? 'جستجو' : 'Search'}
                </button>
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-4">
              {papers.length > 0 && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Found {papers.length} papers. Select papers for analysis.</span>
                  <span className="text-sm font-bold text-indigo-600">{getSelectedPapers().length} Selected</span>
                </div>
              )}

              {papers.map(paper => (
                <div key={paper.id} className={`bg-white p-5 rounded-xl border transition-all hover:shadow-md ${paper.selected ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                  <div className="flex items-start gap-4">
                    <button 
                      onClick={() => togglePaperSelection(paper.id)}
                      className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${paper.selected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 hover:border-indigo-400'}`}
                    >
                      {paper.selected && <CheckCircle className="w-4 h-4 text-white" />}
                    </button>
                    <div className="flex-1">
                       <h3 className="font-bold text-slate-900 text-lg mb-1 leading-tight">
                         <a href={paper.url} target="_blank" rel="noreferrer" className="hover:text-indigo-600 hover:underline">{paper.title}</a>
                       </h3>
                       <div className="text-xs text-slate-500 mb-3 font-medium">
                         {paper.year} • {paper.journal} • {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}
                       </div>
                       <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{paper.abstract}</p>
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {paper.source}
                    </div>
                  </div>
                </div>
              ))}
              
              {papers.length === 0 && !isSearching && (
                <div className="text-center py-20 text-slate-400">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>{language === Language.PERSIAN ? 'شروع به جستجو کنید' : 'Start searching to find papers'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. ANALYSIS TAB */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {getSelectedPapers().length === 0 ? (
              <div className="bg-amber-50 text-amber-800 p-4 rounded-lg border border-amber-200">
                {language === Language.PERSIAN ? 'لطفا ابتدا از تب جستجو مقالات مورد نظر را انتخاب کنید.' : 'Please select papers from the Search tab first.'}
              </div>
            ) : (
              <div className="flex justify-between items-center">
                 <div>
                   <h3 className="font-bold text-lg">{language === Language.PERSIAN ? 'تحلیل مقالات انتخاب شده' : 'Analyzing Selected Papers'}</h3>
                   <p className="text-sm text-slate-500">{getSelectedPapers().length} papers selected for context.</p>
                 </div>
                 <button 
                   onClick={handleAnalyze}
                   disabled={isAnalyzing}
                   className="bg-indigo-600 text-white px-6 py-2 rounded-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
                 >
                    {isAnalyzing ? <Loader2 className="animate-spin" /> : <Activity className="w-4 h-4" />}
                    {language === Language.PERSIAN ? 'شروع تحلیل هوشمند' : 'Start AI Analysis'}
                 </button>
              </div>
            )}

            {analysisResult && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Summary Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h4 className="text-indigo-600 font-bold text-lg mb-3 uppercase tracking-wide text-xs">
                     {language === Language.PERSIAN ? 'خلاصه وضعیت پژوهش' : 'Research Landscape Summary'}
                   </h4>
                   <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{analysisResult.summary}</p>
                </div>

                {/* Gaps Cards */}
                <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
                  {analysisResult.gaps.map((gap, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-indigo-500">
                       <div className="flex justify-between items-start mb-2">
                         <span className="text-4xl font-black text-indigo-100">0{idx+1}</span>
                         <div className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold">GAP</div>
                       </div>
                       <h5 className="font-bold text-slate-900 mb-2">{gap.topic}</h5>
                       <p className="text-sm text-slate-600 mb-4 h-20 overflow-y-auto custom-scrollbar">{gap.description}</p>
                       <div className="pt-4 border-t border-slate-100">
                         <p className="text-xs text-slate-500 italic">"{gap.significance}"</p>
                       </div>
                    </div>
                  ))}
                </div>

                {/* Methodology Suggestion */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-xl text-white shadow-lg">
                   <h4 className="font-bold text-lg mb-2 text-emerald-400">
                     {language === Language.PERSIAN ? 'پیشنهاد متدولوژی برای پژوهش جدید' : 'Proposed Methodology for New Study'}
                   </h4>
                   <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{analysisResult.methodologySuggestions}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. PROPOSAL TAB */}
        {activeTab === 'proposal' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full pb-20">
             {/* Configuration */}
             <div className="lg:col-span-1 space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4">{language === Language.PERSIAN ? 'تنظیمات پروپوزال' : 'Proposal Configuration'}</h3>
                  
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {language === Language.PERSIAN ? 'موضوع/عنوان دقیق' : 'Specific Topic/Title'}
                  </label>
                  <input 
                    type="text" 
                    value={proposalTopic}
                    onChange={e => setProposalTopic(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg mb-4 text-sm"
                    placeholder="e.g. Deep Learning for Early Alzheimer Detection"
                  />

                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {language === Language.PERSIAN ? 'ساختار مورد نیاز' : 'Required Structure'}
                  </label>
                  <textarea 
                    value={proposalStructure}
                    onChange={e => setProposalStructure(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg h-40 text-sm font-mono" 
                  />

                  <div className="mt-6 text-xs text-slate-500 bg-slate-50 p-3 rounded">
                    <strong>Note:</strong> Uses {getSelectedPapers().length} selected papers as context citations.
                  </div>

                  <button 
                    onClick={handleProposal}
                    disabled={isWriting || getSelectedPapers().length === 0}
                    className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-slate-300 flex justify-center items-center gap-2"
                  >
                    {isWriting ? <Loader2 className="animate-spin" /> : <FileText className="w-4 h-4" />}
                    {language === Language.PERSIAN ? 'تولید پروپوزال' : 'Generate Proposal'}
                  </button>
                </div>
             </div>

             {/* Output */}
             <div className="lg:col-span-2 h-full">
                <div className="bg-white h-full min-h-[500px] rounded-xl border border-slate-200 shadow-sm flex flex-col">
                   <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                      <span className="font-bold text-slate-700 text-sm">Generated Draft</span>
                      {proposalText && (
                        <button 
                          onClick={() => downloadTxt('proposal.txt', proposalText)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Download TXT
                        </button>
                      )}
                   </div>
                   <div className="flex-1 p-6 overflow-auto">
                      {proposalText ? (
                        <div className="prose prose-slate max-w-none prose-sm">
                          <pre className="whitespace-pre-wrap font-sans text-slate-700">{proposalText}</pre>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                          {language === Language.PERSIAN ? 'خروجی اینجا نمایش داده می‌شود' : 'Output will appear here'}
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* 4. STATS TAB */}
        {activeTab === 'stats' && (
           <div className="max-w-3xl mx-auto space-y-8">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                 <div className="mb-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full mb-3">
                      <Activity className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {language === Language.PERSIAN ? 'تخمین‌گر هوشمند حجم نمونه' : 'AI Sample Size Estimator'}
                    </h2>
                    <p className="text-slate-500 mt-1">
                      {language === Language.PERSIAN ? 'موضوع تحقیق خود را وارد کنید تا هوش مصنوعی بر اساس مطالعات مشابه، حجم نمونه مناسب را پیشنهاد دهد.' : 'Enter your research topic. AI will reason based on similar studies and statistical power guidelines.'}
                    </p>
                 </div>

                 <div className="flex gap-4 mb-8">
                   <input 
                     type="text" 
                     value={statsTopic}
                     onChange={e => setStatsTopic(e.target.value)}
                     placeholder="e.g. Effect of Aspirin on heart attack prevention in men over 50"
                     className="flex-1 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                   />
                   <button 
                     onClick={handleStatsAI}
                     disabled={isCalculating}
                     className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                   >
                     {isCalculating ? <Loader2 className="animate-spin" /> : "Calculate"}
                   </button>
                 </div>

                 {statsResult && (
                   <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-500">
                      <div className="prose prose-slate max-w-none">
                        <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                          {statsResult}
                        </div>
                      </div>
                   </div>
                 )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-50 pointer-events-none">
                {/* Placeholder for future manual calculator */}
                <div className="bg-white p-6 rounded-lg border border-dashed border-slate-300 text-center">
                  <h4 className="font-bold text-slate-400">Meta-Analysis Helper</h4>
                  <p className="text-xs text-slate-400 mt-2">(Coming Soon)</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-dashed border-slate-300 text-center">
                  <h4 className="font-bold text-slate-400">P-Value Calculator</h4>
                  <p className="text-xs text-slate-400 mt-2">(Coming Soon)</p>
                </div>
              </div>
           </div>
        )}

      </main>
    </div>
  );
};
