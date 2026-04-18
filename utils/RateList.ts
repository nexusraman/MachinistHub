const commonRates: Record<string, number> = {
  '3': 45, '4': 45, '4.5': 45, '5': 45, '6': 45, '5.5': 45,
  '5v4': 50, '5.5v4': 50, '6v4': 50, '7v3': 50, '7v4': 55,
  '8': 60, '9': 70, '10': 80, '12': 120, '15': 150, 'Repair': 15,
}

const kalerTinkuRates: Record<string, number> = {
  '3': 40, '4': 40, '4.5': 40, '5': 40, '6': 40, '5.5': 40,
  '5v4': 50, '5.5v4': 50, '6v4': 50, '7v3': 50, '7v4': 55,
  '8': 60, '9': 70, '10': 80, '12': 120, '15': 150,
}

const gaddiRates: Record<string, number> = {
  '3': 50, '4': 50, '4.5': 50, '5': 50, '6': 50, '5.5': 50, '7v3': 55,
}

const arunRates: Record<string, number> = {
  '3': 45, '4': 45, '4.5': 45, '5': 45, '6': 45, '5.5': 45,
  '5v4': 45, '5.5v4': 45, '6v4': 45, '7v3': 45, '7v4': 45,
  '8': 45, '9': 45, '10': 45, '12': 45, '15': 45,
}

const santoshRates: Record<string, number> = {
  '3': 40, '4': 40, '4.5': 40, '5': 40, '6': 40, '5.5': 40, '7v3': 45,
}

const vickyGroupRates: Record<string, number> = {
  '3': 50, '4': 50, '4.5': 50, '5': 50, '5v4': 50, '6': 50, '5.5': 50,
  '5.5v4': 50, '7v3': 50, '7v4': 55, '8': 60, '8v4': 60,
  '9v3': 70, '9v4': 80, '10': 80, '10v4': 80, '12v4': 120, '15v4': 150,
}

const rateList: Record<string, Record<string, number>> = {
  akash: commonRates, deepu: commonRates, 'deepu 2': commonRates, seko: commonRates,
  simar: commonRates, ranjit: commonRates, gs: commonRates,
  uppal: commonRates, anglo: commonRates, bombay: commonRates,
  manga: commonRates, bhagwati: commonRates,
  kaler: kalerTinkuRates, tinku: kalerTinkuRates,
  gaddi: gaddiRates,
  arun: arunRates,
  santosh: santoshRates,
  vicky: vickyGroupRates, gobind: vickyGroupRates, kaku: vickyGroupRates,
}

export default rateList

export function getRate(clientName: string, size: string): number {
  const clientKey = clientName.toLowerCase()
  const rates = rateList[clientKey] || {}
  return rates[size] || 0
}
