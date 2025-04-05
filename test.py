import requests
from bs4 import BeautifulSoup
import json

def cari_kbbi(kata):
    # URL situs KBBI tidak resmi (contoh: kbbi.web.id)
    url = f"https://kbbi.web.id/{kata}"
    
    try:
        # Mengirim permintaan GET ke situs
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        # Parsing HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Mencari <textarea id="jsdata"> yang berisi JSON
        jsdata = soup.find('textarea', id='jsdata')
        if not jsdata or not jsdata.text:
            return f"Kata '{kata}' tidak ditemukan."
        
        # Parsing JSON
        data = json.loads(jsdata.text)
        if not data or len(data) == 0:
            return f"Definisi untuk '{kata}' tidak tersedia."
        
        # Mengambil hanya entri pertama (paling relevan)
        entri = data[0]
        kata_dasar = entri.get('w', kata)
        definisi_html = entri.get('d', 'Tidak ada definisi')
        
        # Membersihkan HTML dari definisi
        definisi_soup = BeautifulSoup(definisi_html, 'html.parser')
        definisi = definisi_soup.get_text(strip=True)
        
        # Mengembalikan hasil yang ringkas
        return f"{kata_dasar}: {definisi}"
    
    except Exception as e:
        return f"Error: {e}"

# Contoh penggunaan
if __name__ == "__main__":
    kata_cari = input("Masukkan kata: ")
    hasil = cari_kbbi(kata_cari)
    print(hasil)