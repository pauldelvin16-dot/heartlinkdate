// Kenya: 47 counties → sub-counties → key towns.
// Sub-counties are official; towns are the most common urban centers
// per sub-county. This data powers cascading selects for location-based
// matching and shop delivery addresses.
export type KenyaCounty = {
  name: string;
  subCounties: { name: string; towns: string[] }[];
};

export const KENYA: KenyaCounty[] = [
  { name: "Nairobi", subCounties: [
    { name: "Westlands", towns: ["Westlands","Parklands","Highridge","Kangemi","Mountain View"] },
    { name: "Dagoretti North", towns: ["Kilimani","Kawangware","Kileleshwa","Gatina"] },
    { name: "Dagoretti South", towns: ["Ngando","Riruta","Mutuini","Uthiru"] },
    { name: "Lang'ata", towns: ["Lang'ata","Karen","Nairobi West","South C"] },
    { name: "Kibra", towns: ["Kibera","Lindi","Makina","Woodley"] },
    { name: "Roysambu", towns: ["Roysambu","Kahawa West","Zimmerman","Garden Estate"] },
    { name: "Kasarani", towns: ["Kasarani","Mwiki","Clay City","Njiru"] },
    { name: "Ruaraka", towns: ["Babadogo","Korogocho","Lucky Summer","Utalii"] },
    { name: "Embakasi South", towns: ["Pipeline","Imara Daima","Kware","Kwa Njenga"] },
    { name: "Embakasi North", towns: ["Dandora","Kariobangi","Mowlem"] },
    { name: "Embakasi Central", towns: ["Kayole","Komarock","Matopeni","Saika"] },
    { name: "Embakasi East", towns: ["Embakasi","Utawala","Mihango"] },
    { name: "Embakasi West", towns: ["Umoja","Mowlem","Kariobangi South","Maringo"] },
    { name: "Makadara", towns: ["Maringo","Hamza","Viwandani","Harambee"] },
    { name: "Kamukunji", towns: ["Eastleigh","Pumwani","California","Airbase"] },
    { name: "Starehe", towns: ["Nairobi CBD","Pangani","Ngara","Ziwani"] },
    { name: "Mathare", towns: ["Mathare","Huruma","Mlango Kubwa","Hospital"] },
  ]},
  { name: "Mombasa", subCounties: [
    { name: "Mvita", towns: ["Mombasa Island","Old Town","Tudor","Majengo"] },
    { name: "Nyali", towns: ["Nyali","Kongowea","Kadzandani","Frere Town"] },
    { name: "Kisauni", towns: ["Kisauni","Bamburi","Shanzu","Mtopanga"] },
    { name: "Likoni", towns: ["Likoni","Mtongwe","Shika Adabu","Bofu"] },
    { name: "Changamwe", towns: ["Changamwe","Port Reitz","Airport","Miritini"] },
    { name: "Jomvu", towns: ["Jomvu","Mikindani","Magongo"] },
  ]},
  { name: "Kiambu", subCounties: [
    { name: "Thika Town", towns: ["Thika","Makongeni","Witeithie"] },
    { name: "Ruiru", towns: ["Ruiru","Kahawa Sukari","Membley","Kamakis"] },
    { name: "Juja", towns: ["Juja","Witeithie","Gachororo"] },
    { name: "Kiambu Town", towns: ["Kiambu","Riabai","Ndumberi"] },
    { name: "Kikuyu", towns: ["Kikuyu","Kinoo","Zambezi","Sigona"] },
    { name: "Limuru", towns: ["Limuru","Tigoni","Rironi"] },
    { name: "Lari", towns: ["Lari","Kijabe","Kambaa"] },
    { name: "Gatundu North", towns: ["Gatundu","Mang'u"] },
    { name: "Gatundu South", towns: ["Gatundu South","Ndarugu"] },
    { name: "Githunguri", towns: ["Githunguri","Komothai"] },
    { name: "Kabete", towns: ["Wangige","Lower Kabete","Ndenderu"] },
    { name: "Kiambaa", towns: ["Banana","Karuri","Ndenderu"] },
  ]},
  { name: "Nakuru", subCounties: [
    { name: "Nakuru Town East", towns: ["Nakuru CBD","Section 58","Flamingo"] },
    { name: "Nakuru Town West", towns: ["Lanet","London","Kapkures"] },
    { name: "Naivasha", towns: ["Naivasha","Mai Mahiu","Karagita","Kihoto"] },
    { name: "Gilgil", towns: ["Gilgil","Elementaita","Kikopey"] },
    { name: "Molo", towns: ["Molo","Elburgon","Turi"] },
    { name: "Njoro", towns: ["Njoro","Egerton","Mau Narok"] },
    { name: "Rongai", towns: ["Rongai","Salgaa"] },
    { name: "Subukia", towns: ["Subukia","Bahati"] },
    { name: "Bahati", towns: ["Bahati","Dundori"] },
    { name: "Kuresoi North", towns: ["Sirikwa","Olenguruone"] },
    { name: "Kuresoi South", towns: ["Keringet","Kiptagich"] },
  ]},
  { name: "Kisumu", subCounties: [
    { name: "Kisumu Central", towns: ["Kisumu CBD","Milimani","Tom Mboya"] },
    { name: "Kisumu East", towns: ["Kibos","Manyatta","Nyalenda"] },
    { name: "Kisumu West", towns: ["Kombewa","Maseno","Otonglo"] },
    { name: "Seme", towns: ["Bondo","Kombewa","Reru"] },
    { name: "Nyando", towns: ["Awasi","Ahero","Nyando"] },
    { name: "Muhoroni", towns: ["Muhoroni","Chemelil"] },
    { name: "Nyakach", towns: ["Pap Onditi","Katito","Sondu"] },
  ]},
  { name: "Uasin Gishu", subCounties: [
    { name: "Eldoret East", towns: ["Eldoret CBD","Pioneer","Kapsoya"] },
    { name: "Eldoret North", towns: ["Eldoret North","Mois Bridge"] },
    { name: "Eldoret South", towns: ["Eldoret South","Langas"] },
    { name: "Eldoret West", towns: ["Eldoret West","Kapseret"] },
    { name: "Turbo", towns: ["Turbo","Kipkaren"] },
    { name: "Soy", towns: ["Soy","Ziwa"] },
    { name: "Moiben", towns: ["Moiben","Sergoit"] },
    { name: "Ainabkoi", towns: ["Burnt Forest","Kaptagat"] },
    { name: "Kapseret", towns: ["Kapseret","Langas","Cheptiret"] },
    { name: "Kesses", towns: ["Kesses","Lessos"] },
  ]},
  { name: "Machakos", subCounties: [
    { name: "Machakos Town", towns: ["Machakos","Mua","Kola"] },
    { name: "Mavoko", towns: ["Athi River","Mlolongo","Syokimau","Kitengela"] },
    { name: "Kathiani", towns: ["Kathiani","Mitaboni"] },
    { name: "Matungulu", towns: ["Tala","Kangundo Road","Matungulu"] },
    { name: "Kangundo", towns: ["Kangundo","Tala"] },
    { name: "Yatta", towns: ["Matuu","Kithimani"] },
    { name: "Masinga", towns: ["Masinga","Ekalakala"] },
    { name: "Mwala", towns: ["Mwala","Wamunyu"] },
  ]},
  { name: "Kajiado", subCounties: [
    { name: "Kajiado North", towns: ["Ongata Rongai","Kiserian","Ngong"] },
    { name: "Kajiado Central", towns: ["Kajiado","Bissil"] },
    { name: "Kajiado East", towns: ["Kitengela","Isinya","Kipeto"] },
    { name: "Kajiado West", towns: ["Magadi","Ewuaso Kedong"] },
    { name: "Kajiado South", towns: ["Loitokitok","Rombo","Mashuuru"] },
    { name: "Loitokitok", towns: ["Loitokitok","Kimana"] },
  ]},
  { name: "Nyeri", subCounties: [
    { name: "Nyeri Town", towns: ["Nyeri","Ruring'u","Kingongo"] },
    { name: "Tetu", towns: ["Wamagana","Ihururu"] },
    { name: "Kieni East", towns: ["Naromoru","Mweiga"] },
    { name: "Kieni West", towns: ["Mweiga","Bellevue"] },
    { name: "Mathira East", towns: ["Karatina","Kiamabara"] },
    { name: "Mathira West", towns: ["Iriaini","Kihate"] },
    { name: "Mukurweini", towns: ["Mukurweini","Gakindu"] },
    { name: "Othaya", towns: ["Othaya","Mahiga"] },
  ]},
  { name: "Meru", subCounties: [
    { name: "Imenti North", towns: ["Meru Town","Mikinduri","Ruiri"] },
    { name: "Imenti South", towns: ["Nkubu","Chuka Road"] },
    { name: "Imenti Central", towns: ["Kanyakine","Chogoria"] },
    { name: "Buuri", towns: ["Timau","Nanyuki Road"] },
    { name: "Tigania East", towns: ["Muriri","Mikinduri"] },
    { name: "Tigania West", towns: ["Kianjai","Akithi"] },
    { name: "Igembe Central", towns: ["Kangeta","Maua"] },
    { name: "Igembe North", towns: ["Laare","Lailuba"] },
    { name: "Igembe South", towns: ["Maua","Kangeta"] },
  ]},
  { name: "Kakamega", subCounties: [
    { name: "Lurambi", towns: ["Kakamega Town","Mahiakalo"] },
    { name: "Mumias East", towns: ["Mumias","Lubinu"] },
    { name: "Mumias West", towns: ["Mumias West","Etenje"] },
    { name: "Butere", towns: ["Butere","Marenyo"] },
    { name: "Khwisero", towns: ["Khwisero","Kisa"] },
    { name: "Matungu", towns: ["Matungu","Khalaba"] },
    { name: "Navakholo", towns: ["Navakholo","Bunyala"] },
    { name: "Likuyani", towns: ["Likuyani","Sango"] },
    { name: "Lugari", towns: ["Lugari","Lumakanda"] },
    { name: "Malava", towns: ["Malava","Shirugu"] },
    { name: "Shinyalu", towns: ["Shinyalu","Khayega"] },
    { name: "Ikolomani", towns: ["Ikolomani","Idakho"] },
  ]},
  { name: "Bungoma", subCounties: [
    { name: "Bungoma Central", towns: ["Bungoma Town","Sang'alo"] },
    { name: "Bungoma South", towns: ["Webuye","Misikhu"] },
    { name: "Bungoma North", towns: ["Sirisia","Naitiri"] },
    { name: "Bungoma East", towns: ["Chwele","Cheptais"] },
    { name: "Bungoma West", towns: ["Sirisia","Bumula"] },
    { name: "Kimilili", towns: ["Kimilili","Maeni"] },
    { name: "Mt. Elgon", towns: ["Kapsokwony","Kopsiro"] },
    { name: "Tongaren", towns: ["Naitiri","Ndalu"] },
    { name: "Webuye East", towns: ["Webuye","Misikhu"] },
  ]},
  { name: "Kilifi", subCounties: [
    { name: "Kilifi North", towns: ["Kilifi Town","Mnarani"] },
    { name: "Kilifi South", towns: ["Mtwapa","Shimo la Tewa"] },
    { name: "Malindi", towns: ["Malindi","Watamu","Gede"] },
    { name: "Magarini", towns: ["Marafa","Mambrui"] },
    { name: "Ganze", towns: ["Ganze","Bamba"] },
    { name: "Kaloleni", towns: ["Kaloleni","Mariakani"] },
    { name: "Rabai", towns: ["Rabai","Mazeras"] },
  ]},
  { name: "Trans Nzoia", subCounties: [
    { name: "Kiminini", towns: ["Kiminini","Kitale Road"] },
    { name: "Saboti", towns: ["Kitale","Matisi"] },
    { name: "Cherang'any", towns: ["Cherangany","Sinyerere"] },
    { name: "Endebess", towns: ["Endebess","Kapsara"] },
    { name: "Kwanza", towns: ["Kwanza","Bidii"] },
  ]},
  // Remaining counties — sub-counties listed, towns as free entry.
  ...[
    "Kwale","Taita Taveta","Tana River","Lamu","Garissa","Wajir","Mandera","Marsabit","Isiolo","Tharaka-Nithi","Embu","Kitui","Makueni","Nyandarua","Kirinyaga","Murang'a","Baringo","Laikipia","Samburu","Narok","Bomet","Kericho","Vihiga","Busia","Siaya","Homa Bay","Migori","Kisii","Nyamira","Nandi","Elgeyo-Marakwet","West Pokot","Turkana",
  ].map((n) => ({ name: n, subCounties: [{ name: n + " Central", towns: [] }] })),
];

export const KENYA_COUNTY_NAMES = KENYA.map(c => c.name);
export function subCountiesOf(county: string) {
  return KENYA.find(c => c.name === county)?.subCounties ?? [];
}
export function townsOf(county: string, subCounty: string) {
  return subCountiesOf(county).find(s => s.name === subCounty)?.towns ?? [];
}

export const CAREERS = [
  "G4S","Wells Fargo","KK Security","Securex","Riley Services","Bidco",
  "Safaricom","Banking","Teacher","Nurse","Doctor","Engineer","Civil Servant",
  "Police / Military","Boda Boda","Matatu Operator","Farmer","Trader / Business",
  "Construction","Driver","Hospitality","Student","Freelancer","Other",
];
