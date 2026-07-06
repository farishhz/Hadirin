<?php

class Siswa {
    public function IsiNama($nama) {
        echo "Nama : $nama <br>";
        return $this;
    }

    public function IsiKelas($kelas) {
        echo "Kelas : $kelas <br>";
        return $this;
    }

    public function IsiJurusan($jurusan) {
        echo "Jurusan : $jurusan a <br>";
        return $this;
    }

    public function IsiNilai($nilai) {
        echo "Nilai : $nilai <br>";
        return $this;
    }

    public function IsiMapel($mapel) {
        echo "Mapel : $mapel <br>";
        return $this;
    }
}

$siswa1 = new Siswa;
$siswa1->IsiNama("Alfarisi Azmir")
        ->IsiKelas("XI RPL 1")
        ->IsiJurusan("RPL")
        ->IsiNilai(100)
        ->IsiMapel("Matematika");


?> 

// toloong buat method nya saya udh buat class nya