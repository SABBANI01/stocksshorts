// Intelligent image selection based on article content with unique variety
export function getArticleImage(article: any): string {
  const title = (article.title || '').toLowerCase();
  const content = (article.content || '').toLowerCase();
  const category = (article.category || '').toLowerCase();
  const stockSymbol = (article.stockSymbol || '').toLowerCase();
  const articleId = article.id || 1;
  
  // Create a simple hash from article content to ensure uniqueness
  const contentHash = (title + content + stockSymbol).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Diverse image pools for different content types
  const diverseImagePools = {
    // Market/Index related images
    market: [
      'https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/3184358/pexels-photo-3184358.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/590041/pexels-photo-590041.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/6802042/pexels-photo-6802042.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/4386464/pexels-photo-4386464.jpeg?auto=compress&cs=tinysrgb&w=600&h=400'
    ],
    
    // Banking/Finance images
    banking: [
      'https://images.pexels.com/photos/259200/pexels-photo-259200.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/4386476/pexels-photo-4386476.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/6289065/pexels-photo-6289065.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/4386433/pexels-photo-4386433.jpeg?auto=compress&cs=tinysrgb&w=600&h=400'
    ],
    
    // Technology/IT images
    technology: [
      'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/3184306/pexels-photo-3184306.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/3184633/pexels-photo-3184633.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/4164418/pexels-photo-4164418.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/4348401/pexels-photo-4348401.jpeg?auto=compress&cs=tinysrgb&w=600&h=400'
    ],
    
    // Automotive images
    automotive: [
      'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/1007410/pexels-photo-1007410.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/1149137/pexels-photo-1149137.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/2079246/pexels-photo-2079246.jpeg?auto=compress&cs=tinysrgb&w=600&h=400'
    ],
    
    // Energy/Industrial images
    energy: [
      'https://images.pexels.com/photos/2800832/pexels-photo-2800832.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/356036/pexels-photo-356036.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/433308/pexels-photo-433308.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/2800830/pexels-photo-2800830.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/415974/pexels-photo-415974.jpeg?auto=compress&cs=tinysrgb&w=600&h=400'
    ],
    
    // Healthcare/Pharma images
    healthcare: [
      'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/4033148/pexels-photo-4033148.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/3825368/pexels-photo-3825368.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/4167541/pexels-photo-4167541.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg?auto=compress&cs=tinysrgb&w=600&h=400'
    ],
    
    // Retail/Consumer images
    retail: [
      'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/1005638/pexels-photo-1005638.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/811101/pexels-photo-811101.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/2292953/pexels-photo-2292953.jpeg?auto=compress&cs=tinysrgb&w=600&h=400'
    ],
    
    // Fintech/Digital images
    fintech: [
      'https://images.pexels.com/photos/919734/pexels-photo-919734.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/4386467/pexels-photo-4386467.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/6289025/pexels-photo-6289025.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/4164418/pexels-photo-4164418.jpeg?auto=compress&cs=tinysrgb&w=600&h=400'
    ],
    
    // Trading/Charts images
    trading: [
      'https://images.pexels.com/photos/590041/pexels-photo-590041.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/7567438/pexels-photo-7567438.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/6802042/pexels-photo-6802042.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
      'https://images.pexels.com/photos/3184320/pexels-photo-3184320.jpeg?auto=compress&cs=tinysrgb&w=600&h=400'
    ]
  };
  
  function selectUniqueImage(pool: string[]): string {
    const index = Math.abs(contentHash + articleId) % pool.length;
    return pool[index];
  }
  
  // Content-based intelligent detection
  const fullText = title + ' ' + content;
  
  // Detailed keyword mapping for content analysis
  if (fullText.includes('nifty') || fullText.includes('sensex') || fullText.includes('index') || fullText.includes('market')) {
    return selectUniqueImage(diverseImagePools.market);
  }
  
  if (fullText.includes('bank') || fullText.includes('hdfc') || fullText.includes('sbi') || fullText.includes('icici') || fullText.includes('kotak') || fullText.includes('axis')) {
    return selectUniqueImage(diverseImagePools.banking);
  }
  
  if (fullText.includes('tcs') || fullText.includes('infosys') || fullText.includes('wipro') || fullText.includes('tech') || fullText.includes('software') || fullText.includes('it ') || fullText.includes('digital')) {
    return selectUniqueImage(diverseImagePools.technology);
  }
  
  if (fullText.includes('maruti') || fullText.includes('tata motors') || fullText.includes('mahindra') || fullText.includes('bajaj auto') || fullText.includes('auto') || fullText.includes('car') || fullText.includes('vehicle')) {
    return selectUniqueImage(diverseImagePools.automotive);
  }
  
  if (fullText.includes('ntpc') || fullText.includes('ongc') || fullText.includes('coal') || fullText.includes('power') || fullText.includes('energy') || fullText.includes('oil') || fullText.includes('gas')) {
    return selectUniqueImage(diverseImagePools.energy);
  }
  
  if (fullText.includes('pharma') || fullText.includes('drug') || fullText.includes('medicine') || fullText.includes('health') || fullText.includes('cipla') || fullText.includes('sun pharma')) {
    return selectUniqueImage(diverseImagePools.healthcare);
  }
  
  if (fullText.includes('dmart') || fullText.includes('retail') || fullText.includes('consumer') || fullText.includes('fmcg') || fullText.includes('goods') || fullText.includes('store')) {
    return selectUniqueImage(diverseImagePools.retail);
  }
  
  if (fullText.includes('paytm') || fullText.includes('payment') || fullText.includes('fintech') || fullText.includes('wallet') || fullText.includes('upi') || fullText.includes('digital payment')) {
    return selectUniqueImage(diverseImagePools.fintech);
  }
  
  // Category-based fallback with variety
  switch (category) {
    case 'breakout':
    case 'warrant':
    case 'movers':
      return selectUniqueImage(diverseImagePools.trading);
    case 'ipo':
    case 'sme ipo':
    case 'results':
    case 'research_report':
      return selectUniqueImage(diverseImagePools.market);
    case 'nifty':
      return selectUniqueImage(diverseImagePools.market);
    default:
      return selectUniqueImage(diverseImagePools.market);
  }
}