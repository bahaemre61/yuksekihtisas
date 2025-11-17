export default function DashboardHome() {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Ana Sayfa</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Aktif Araç Talepleri
          </h3>
          <div className="h-96 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">
              Talep Takip Haritası / Listesi buraya gelecek.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              İdari Duyurular
            </h3>
            <div className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Duyurular burada.</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Günün Menüsü
            </h3>
            <div className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Yemek menüsü burada.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}