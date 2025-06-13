document.addEventListener('DOMContentLoaded', function() {
    // --- 1. CONFIGURACIÓN INICIAL Y DE FECHA ---
    const appScriptUrl = 'https://script.google.com/macros/s/AKfycbx5JakaAEwidZ3b9PzTIVV4VeefbRIyA6TaG8OJdNH5ZIgND8FL5ePhV1OughnE3E6Q/exec';
    const UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutos en milisegundos
    const dateElement = document.getElementById('current-date');
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    if (dateElement) {
        dateElement.textContent = today.toLocaleDateString('es-ES', options);
    }

    // --- 2. VARIABLES GLOBALES ---
    let allData = [];
    let manualData = {}; // Para almacenar datos manuales por fecha
    const modelFilter = document.getElementById('model-filter');
    const dateFilter = document.getElementById('date-filter');
    const loadingIndicator = document.getElementById('loading-indicator');
    const lineStatusTbody = document.getElementById('line-status-tbody');
    const clearDataBtn = document.getElementById('clear-data-btn');

    // --- 3. FUNCIONES DE LOCALSTORAGE (EXPANDIDAS) ---
    function saveStateToStorage() {
        try {
            const state = {
                manualData: manualData,
                selectedModel: modelFilter?.value || '',
                selectedDate: dateFilter?.value || ''
            };
            localStorage.setItem('explorerAppState', JSON.stringify(state));
            console.log('Estado completo guardado en localStorage:', state);
        } catch (error) {
            console.error('Error al guardar estado en localStorage:', error);
        }
    }

    function loadStateFromStorage() {
        try {
            const savedState = localStorage.getItem('explorerAppState');
            if (savedState) {
                const state = JSON.parse(savedState);
                manualData = state.manualData || {};
                console.log('Estado completo cargado desde localStorage:', state);
                return state;
            }
        } catch (error) {
            console.error('Error al cargar estado desde localStorage:', error);
            manualData = {};
        }
        return null;
    }

    function saveManualDataToStorage() {
        saveStateToStorage(); // Ahora guarda todo el estado
    }

    function loadManualDataFromStorage() {
        const state = loadStateFromStorage();
        return state !== null;
    }

    function clearManualDataFromStorage() {
        try {
            localStorage.removeItem('explorerAppState');
            manualData = {};
            console.log('Estado completo eliminado del localStorage');
            
            // Resetear filtros
            if (modelFilter) modelFilter.value = '';
            if (dateFilter) dateFilter.value = '';
            
            // Mostrar mensaje de confirmación
            showNotification('Datos eliminados correctamente', 'success');
            
            // Mostrar tabla vacía
            showEmptyTable();
        } catch (error) {
            console.error('Error al eliminar localStorage:', error);
            showNotification('Error al eliminar datos', 'error');
        }
    }

    function showNotification(message, type) {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium transition-all duration-300 transform translate-x-full`;
        notification.className += type === 'success' ? ' bg-green-600' : ' bg-red-600';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animación de entrada
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // --- 4. FUNCIONES AUXILIARES (SIN CAMBIOS) ---
    function showLoading(show) {
        if (loadingIndicator) {
            if (show) {
                loadingIndicator.classList.remove('hidden');
            } else {
                loadingIndicator.classList.add('hidden');
            }
        }
        
        if (modelFilter) {
            if (show) {
                modelFilter.innerHTML = '<option value="">Cargando modelos...</option>';
            }
        }
    }

    function showError(message) {
        showLoading(false);
        if (modelFilter) {
            modelFilter.innerHTML = '<option value="">Error al cargar</option>';
        }
        if (lineStatusTbody) {
            lineStatusTbody.innerHTML = `
                <tr>
                    <td colspan="23" class="px-6 py-8 text-center text-red-400">
                        ${message}
                    </td>
                </tr>
            `;
        }
        console.error('Error en la aplicación:', message);
    }

    function showEmptyTable() {
        if (lineStatusTbody) {
            lineStatusTbody.innerHTML = `
                <tr>
                    <td colspan="23" class="px-6 py-8 text-center text-gray-400">
                        ${modelFilter && modelFilter.value ? 'No hay datos para los filtros seleccionados' : 'Seleccione un modelo para ver los datos'}
                    </td>
                </tr>
            `;
        }
    }

    // --- 5. FORMATEAR FECHA (SIN CAMBIOS) ---
    function formatDate(dateString) {
        if (!dateString) return null;
        
        try {
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                return dateString;
            }
            
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
            
            return null;
        } catch (error) {
            console.error('Error al formatear fecha:', dateString, error);
            return null;
        }
    }

    // --- 6. CARGAR DATOS INICIALES (MODIFICADO) ---
    async function loadInitialData() {
        if (!modelFilter || !loadingIndicator || !lineStatusTbody || !dateFilter) {
            console.error('Elementos DOM requeridos no encontrados');
            return;
        }
        
        // Cargar estado completo desde localStorage
        const savedState = loadStateFromStorage();
        
        try {
            console.log('Iniciando carga de datos...');
            showLoading(true);
            
            const response = await fetch(appScriptUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const responseData = await response.json();
            console.log('Response completa:', responseData);
            
            if (responseData && responseData.success && responseData.data && Array.isArray(responseData.data)) {
                const data = responseData.data;
                console.log('Datos extraídos correctamente:', data);
                
                if (data.length > 0) {
                    allData = data.map(item => ({
                        ...item,
                        FormattedDate: formatDate(item.Date)
                    })).filter(item => item.FormattedDate !== null);
                    
                    console.log('Datos procesados:', allData.length);
                    populateModelFilter(allData, savedState);
                    populateDateFilter(allData, savedState);
                    showLoading(false);
                } else {
                    throw new Error('No hay registros en los datos');
                }
            } else {
                throw new Error('Formato de respuesta incorrecto');
            }
        } catch (error) {
            console.error('Error completo al cargar datos:', error);
            showError(`Error al cargar los datos: ${error.message}`);
        }
    }

    // --- 7. POBLAR FILTRO DE MODELOS (MODIFICADO) ---
    function populateModelFilter(data, savedState) {
        try {
            const uniqueModels = [...new Set(data.map(item => item.Name))].filter(name => name && name.toString().trim() !== '');
            
            modelFilter.innerHTML = '<option value="">Seleccione un modelo</option>';
            
            if (uniqueModels.length === 0) {
                modelFilter.innerHTML += '<option value="">No hay modelos disponibles</option>';
                return;
            }
            
            uniqueModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                modelFilter.appendChild(option);
            });

            // Restaurar modelo seleccionado si existe en el estado guardado
            if (savedState && savedState.selectedModel && uniqueModels.includes(savedState.selectedModel)) {
                modelFilter.value = savedState.selectedModel;
                console.log('Modelo restaurado:', savedState.selectedModel);
            } else if (uniqueModels.length > 0) {
                // Solo seleccionar el primer modelo si no hay estado guardado
                const firstModel = uniqueModels[0];
                modelFilter.value = firstModel;
                console.log('Primer modelo seleccionado:', firstModel);
            }
            
        } catch (error) {
            console.error('Error al poblar filtro de modelos:', error);
            showError('Error al cargar modelos');
        }
    }

    // --- 8. POBLAR FILTRO DE FECHAS (MODIFICADO) ---
    function populateDateFilter(data, savedState) {
        try {
            const uniqueDates = [...new Set(data.map(item => item.FormattedDate))].filter(date => date !== null).sort();
            
            dateFilter.innerHTML = '<option value="">Todas las fechas</option>';
            
            uniqueDates.forEach(date => {
                const option = document.createElement('option');
                option.value = date;
                option.textContent = date;
                dateFilter.appendChild(option);
            });

            // Restaurar fecha seleccionada si existe en el estado guardado
            if (savedState && savedState.selectedDate && uniqueDates.includes(savedState.selectedDate)) {
                dateFilter.value = savedState.selectedDate;
                console.log('Fecha restaurada:', savedState.selectedDate);
            }

            // Solo filtrar si hay un modelo seleccionado
            if (modelFilter.value) {
                filterAndUpdateTable();
            }
            
        } catch (error) {
            console.error('Error al poblar filtro de fechas:', error);
        }
    }

    // --- 9. FILTRAR Y ACTUALIZAR TABLA (SIN CAMBIOS) ---
    function filterAndUpdateTable() {
        const selectedModel = modelFilter.value;
        const selectedDate = dateFilter.value;
        
        console.log('Filtrando por modelo:', selectedModel, 'y fecha desde:', selectedDate);
        
        if (!selectedModel) {
            showEmptyTable();
            return;
        }

        let filteredData = allData.filter(item => 
            item.Name && item.Name.toString() === selectedModel.toString()
        );

        if (selectedDate) {
            filteredData = filteredData.filter(item => 
                item.FormattedDate >= selectedDate
            );
        }
        
        console.log('Datos filtrados:', filteredData.length);
        updateLineStatusTable(filteredData);
        
        // Guardar estado después de filtrar
        saveStateToStorage();
    }

    // --- 10. ACTUALIZAR TABLA DE ESTADO DE LÍNEA (SIN CAMBIOS) ---
    function updateLineStatusTable(data) {
        if (!data || data.length === 0) {
            showEmptyTable();
            return;
        }

        console.log('Actualizando tabla con', data.length, 'registros');

        lineStatusTbody.innerHTML = '';

        const dateGroups = {};
        
        data.forEach(item => {
            const date = item.FormattedDate;
            const process = item.Process || 'Sin proceso';
            const primeHandle = parseInt(item['Prime Handle']) || 0;
            
            if (!dateGroups[date]) {
                dateGroups[date] = {};
            }
            
            if (!dateGroups[date][process]) {
                dateGroups[date][process] = 0;
            }
            
            dateGroups[date][process] += primeHandle;
        });

        console.log('Grupos por fecha:', dateGroups);

        const sortedDates = Object.keys(dateGroups).sort();
        
        // ELIMINAR XCVR_RT de la lista de procesos
        const processColumns = [
            'IFLASH', 'UCT', 'FODTEST', 'XCVR_LT', 'LCDCAL', 'L2VISION', 
            'L2AR', 'DEPTHCAL', 'DEPTHVAL', 'TELECAL', 'TELEVAL', 'CFC'
        ];
        
        const totals = {};
        processColumns.forEach(col => totals[col] = 0);

        sortedDates.forEach(date => {
            const dateData = dateGroups[date];
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-700 hover:bg-gray-750';
            
            let rowHTML = `<td class="px-4 py-3 font-medium text-white">${date}</td>`;
            
            // Campo INPUT (manual)
            rowHTML += `<td class="px-4 py-3"><input type="number" class="manual-input bg-gray-700 text-white px-2 py-1 rounded w-16 text-center" data-date="${date}" data-field="INPUT" value="${manualData[date]?.INPUT || ''}" placeholder="0"></td>`;
            
            // Procesos automáticos de la API (SIN XCVR_RT)
            processColumns.forEach(processCol => {
                const value = dateData[processCol] || 0;
                rowHTML += `<td class="px-4 py-3 text-center">${value || '-'}</td>`;
                if (value > 0) totals[processCol] += value;
            });
            
            // Campos manuales
            rowHTML += `<td class="px-4 py-3"><input type="number" class="manual-input bg-gray-700 text-white px-2 py-1 rounded w-16 text-center" data-date="${date}" data-field="CQA1" value="${manualData[date]?.CQA1 || ''}" placeholder="0"></td>`;
            rowHTML += `<td class="px-4 py-3"><input type="number" class="manual-input bg-gray-700 text-white px-2 py-1 rounded w-16 text-center" data-date="${date}" data-field="RUNNING" value="${manualData[date]?.RUNNING || ''}" placeholder="0"></td>`;
            rowHTML += `<td class="px-4 py-3"><input type="number" class="manual-input bg-gray-700 text-white px-2 py-1 rounded w-16 text-center" data-date="${date}" data-field="CQA2" value="${manualData[date]?.CQA2 || ''}" placeholder="0"></td>`;
            rowHTML += `<td class="px-4 py-3"><input type="number" class="manual-input bg-gray-700 text-white px-2 py-1 rounded w-16 text-center" data-date="${date}" data-field="Defectos" value="${manualData[date]?.Defectos || ''}" placeholder="0"></td>`;
            rowHTML += `<td class="px-4 py-3"><input type="number" class="manual-input bg-gray-700 text-white px-2 py-1 rounded w-16 text-center" data-date="${date}" data-field="CQA1 Def." value="${manualData[date]?.['CQA1 Def.'] || ''}" placeholder="0"></td>`;
            rowHTML += `<td class="px-4 py-3"><input type="number" class="manual-input bg-gray-700 text-white px-2 py-1 rounded w-16 text-center" data-date="${date}" data-field="CQA2 Def." value="${manualData[date]?.['CQA2 Def.'] || ''}" placeholder="0"></td>`;
            rowHTML += `<td class="px-4 py-3"><input type="number" class="manual-input bg-gray-700 text-white px-2 py-1 rounded w-16 text-center" data-date="${date}" data-field="DPHU" value="${manualData[date]?.DPHU || ''}" placeholder="0"></td>`;
            rowHTML += `<td class="px-4 py-3 text-center text-yellow-400 font-bold">7</td>`;
            rowHTML += `<td class="px-4 py-3"><input type="number" class="manual-input bg-gray-700 text-white px-2 py-1 rounded w-16 text-center" data-date="${date}" data-field="Output" value="${manualData[date]?.Output || ''}" placeholder="0"></td>`;

            row.innerHTML = rowHTML;
            lineStatusTbody.appendChild(row);
        });

        const totalRow = document.createElement('tr');
        totalRow.className = 'bg-gray-700 font-bold border-t-2 border-indigo-500';
        totalRow.id = 'totals-row';
        
        updateTotalsRow(totalRow, totals, processColumns);
        lineStatusTbody.appendChild(totalRow);

        addManualInputListeners();
    }

    // --- 11. ACTUALIZAR FILA DE TOTALES (SIN CAMBIOS) ---
    function updateTotalsRow(totalRow, processColumnTotals, processColumns) {
        let totalRowHTML = `<td class="px-4 py-3 text-white font-bold">TOTAL</td>`;
        
        const totalInput = Object.values(manualData).reduce((sum, dateData) => sum + (parseInt(dateData?.INPUT) || 0), 0);
        totalRowHTML += `<td class="px-4 py-3 text-white text-center font-bold">${totalInput || '-'}</td>`;
        
        processColumns.forEach(col => {
            totalRowHTML += `<td class="px-4 py-3 text-white text-center font-bold">${processColumnTotals[col] || '-'}</td>`;
        });
        
        const manualTotals = {
            'CQA1': Object.values(manualData).reduce((sum, dateData) => sum + (parseInt(dateData?.CQA1) || 0), 0),
            'RUNNING': Object.values(manualData).reduce((sum, dateData) => sum + (parseInt(dateData?.RUNNING) || 0), 0),
            'CQA2': Object.values(manualData).reduce((sum, dateData) => sum + (parseInt(dateData?.CQA2) || 0), 0),
            'Defectos': Object.values(manualData).reduce((sum, dateData) => sum + (parseInt(dateData?.Defectos) || 0), 0),
            'CQA1 Def.': Object.values(manualData).reduce((sum, dateData) => sum + (parseInt(dateData?.['CQA1 Def.']) || 0), 0),
            'CQA2 Def.': Object.values(manualData).reduce((sum, dateData) => sum + (parseInt(dateData?.['CQA2 Def.']) || 0), 0),
            'DPHU': Object.values(manualData).reduce((sum, dateData) => sum + (parseInt(dateData?.DPHU) || 0), 0),
            'Output': Object.values(manualData).reduce((sum, dateData) => sum + (parseInt(dateData?.Output) || 0), 0)
        };
        
        totalRowHTML += `<td class="px-4 py-3 text-white text-center font-bold">${manualTotals.CQA1 || '-'}</td>`;
        totalRowHTML += `<td class="px-4 py-3 text-white text-center font-bold">${manualTotals.RUNNING || '-'}</td>`;
        totalRowHTML += `<td class="px-4 py-3 text-white text-center font-bold">${manualTotals.CQA2 || '-'}</td>`;
        totalRowHTML += `<td class="px-4 py-3 text-white text-center font-bold">${manualTotals.Defectos || '-'}</td>`;
        totalRowHTML += `<td class="px-4 py-3 text-white text-center font-bold">${manualTotals['CQA1 Def.'] || '-'}</td>`;
        totalRowHTML += `<td class="px-4 py-3 text-white text-center font-bold">${manualTotals['CQA2 Def.'] || '-'}</td>`;
        totalRowHTML += `<td class="px-4 py-3 text-white text-center font-bold">${manualTotals.DPHU || '-'}</td>`;
        totalRowHTML += `<td class="px-4 py-3 text-yellow-400 text-center font-bold">7</td>`;
        totalRowHTML += `<td class="px-4 py-3 text-white text-center font-bold">${manualTotals.Output || '-'}</td>`;

        totalRow.innerHTML = totalRowHTML;
    }

    // --- 12. AGREGAR LISTENERS PARA INPUTS MANUALES (MODIFICADO) ---
    function addManualInputListeners() {
        const manualInputs = document.querySelectorAll('.manual-input');
        
        manualInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const date = e.target.getAttribute('data-date');
                const field = e.target.getAttribute('data-field');
                const value = e.target.value;
                
                if (!manualData[date]) {
                    manualData[date] = {};
                }
                
                manualData[date][field] = value;
                console.log('Datos manuales actualizados:', manualData);
                
                // Guardar estado completo en localStorage
                saveStateToStorage();
                
                // Actualizar totales inmediatamente
                updateTotalsInRealTime();
            });
        });
    }

    // --- 13. ACTUALIZAR TOTALES EN TIEMPO REAL (SIN CAMBIOS) ---
    function updateTotalsInRealTime() {
        const totalRow = document.getElementById('totals-row');
        if (!totalRow) return;

        const processColumns = [
            'IFLASH', 'UCT', 'FODTEST', 'XCVR_LT', 'LCDCAL', 'L2VISION', 
            'L2AR', 'DEPTHCAL', 'DEPTHVAL', 'TELECAL', 'TELEVAL', 'CFC'
        ];
        
        const processColumnTotals = {};
        processColumns.forEach(col => processColumnTotals[col] = 0);
        
        const allRows = lineStatusTbody.querySelectorAll('tr:not(#totals-row)');
        allRows.forEach(row => {
            const cells = row.cells;
            processColumns.forEach((col, index) => {
                const cellValue = cells[index + 2]?.textContent;
                const value = parseInt(cellValue) || 0;
                if (value > 0 && cellValue !== '-') {
                    processColumnTotals[col] += value;
                }
            });
        });

        updateTotalsRow(totalRow, processColumnTotals, processColumns);
        
        totalRow.classList.add('bg-indigo-600');
        setTimeout(() => {
            totalRow.classList.remove('bg-indigo-600');
            totalRow.classList.add('bg-gray-700');
        }, 300);
    }

    // --- 14. FUNCIONES DE GRÁFICOS DE PROCESOS (ACTUALIZADO) ---
    function createProcessReports() {
        if (!allData || allData.length === 0) {
            console.log('No hay datos para crear gráficos de procesos');
            return;
        }

        const selectedModel = modelFilter?.value;
        if (!selectedModel) {
            console.log('No hay modelo seleccionado');
            return;
        }

        // Lista completa de procesos
        const processes = ['UCT', 'FODTEST', 'XCVR_LT', 'LCDCAL', 'L2VISION', 'L2AR', 'DEPTHCAL', 'DEPTHVAL', 'TELECAL', 'TELEVAL', 'CFC'];
        
        const container = document.getElementById('process-reports-container');
        if (!container) return;

        // Limpiar contenedor
        container.innerHTML = '';

        processes.forEach(process => {
            createProcessReport(process, container);
        });
    }

    const FTY_TARGETS = {
        'UCT': 98.00,
        'FODTEST': 98.00,
        'XCVR_LT': 95.00,
        'LCDCAL': 98.00,
        'L2VISION': 95.00,
        'L2AR': 95.00,
        'DEPTHCAL': 98.00,
        'DEPTHVAL': 98.00,
        'TELECAL': 98.00,
        'TELEVAL': 98.00,
        'CFC': 98.00
    };

    function createProcessChart(processName) {
        const canvas = document.querySelector(`[data-chart="${processName}"]`);
        if (!canvas) {
            console.log(`Canvas no encontrado para proceso ${processName}`);
            return;
        }

        const selectedModel = modelFilter?.value;
        const selectedDate = dateFilter?.value;
        if (!selectedModel) {
            console.log('No hay modelo seleccionado');
            return;
        }

        // 1. Filtrar datos de la API por modelo, proceso y fecha
        let processData = allData.filter(item => 
            item.Name === selectedModel && 
            item.Process === processName
        );

        // Filtrar por fecha si hay una seleccionada
        if (selectedDate) {
            processData = processData.filter(item => {
                const itemDate = item.Date.split('T')[0];
                return itemDate >= selectedDate;
            });
        }

        console.log(`Datos filtrados para ${processName} desde ${selectedDate || 'todas las fechas'}:`, processData);

        // 2. Agrupar datos por fecha y calcular FTY%
        const groupedData = processData.reduce((acc, item) => {
            const date = item.Date.split('T')[0];
            if (!acc[date]) {
                acc[date] = {
                    primeHandle: 0,
                    primePass: 0,
                    primeFail: 0
                };
            }
            acc[date].primeHandle += parseInt(item['Prime Handle']) || 0;
            acc[date].primePass += parseInt(item['Prime Pass']) || 0;
            acc[date].primeFail += parseInt(item['Prime Fail']) || 0;
            return acc;
        }, {});

        // 3. Preparar datos para el gráfico
        const sortedDates = Object.keys(groupedData).sort();
        const chartData = {
            labels: sortedDates.map(date => {
                const [year, month, day] = date.split('-');
                return `${day}/${month}`;
            }),
            values: sortedDates.map(date => groupedData[date].primeHandle),
            ftyValues: sortedDates.map(date => {
                const data = groupedData[date];
                return data.primeHandle > 0 ? 
                    (data.primePass * 100) / data.primeHandle : 
                    0;
            })
        };

        // 4. Crear el gráfico combinado
        const ctx = canvas.getContext('2d');
        
        if (canvas.chart) {
            canvas.chart.destroy();
        }

        canvas.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Prime Handle',
                        data: chartData.values,
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        order: 2,
                        yAxisID: 'y',
                        datalabels: {
                            anchor: 'center',
                            align: 'center',
                            color: 'white',
                            font: {
                                weight: 'bold'
                            },
                            formatter: value => value || ''
                        }
                    },
                    {
                        type: 'line',
                        label: 'FTY%',
                        data: chartData.ftyValues,
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 3,
                        pointRadius: 6,
                        pointBackgroundColor: 'rgb(239, 68, 68)',
                        pointBorderColor: 'white',
                        pointBorderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        order: 1,
                        yAxisID: 'y1',
                        datalabels: {
                            anchor: 'end',
                            align: 'top',
                            color: 'white',
                            backgroundColor: 'rgba(239, 68, 68, 0.8)',
                            borderRadius: 4,
                            padding: 4,
                            font: {
                                weight: 'bold'
                            },
                            formatter: value => value.toFixed(1) + '%'
                        }
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    datalabels: {
                        display: true
                    },
                    legend: {
                        display: true,
                        labels: {
                            color: 'white',
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        callbacks: {
                            title: function(tooltipItems) {
                                return `Fecha: ${tooltipItems[0].label}`;
                            },
                            label: function(context) {
                                if (context.dataset.label === 'Prime Handle') {
                                    return `Prime Handle: ${context.parsed.y}`;
                            } else {
                                return `FTY%: ${context.parsed.y.toFixed(2)}%`;
                            }
                            }
                        }
                    }
                },
                    scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgb(156, 163, 175)'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgb(156, 163, 175)'
                        },
                        title: {
                            display: true,
                            text: 'Prime Handle',
                            color: 'rgb(156, 163, 175)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        max: 110, // Aumentado a 110%
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            color: 'rgb(156, 163, 175)',
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        title: {
                            display: true,
                            text: 'FTY%',
                            color: 'rgb(156, 163, 175)'
                        }
                    }
                }
            },
            plugins: [{
                id: 'targetLine',
                afterDatasetsDraw: (chart) => {
                    const ctx = chart.ctx;
                    const chartArea = chart.chartArea;
                    const y1Scale = chart.scales.y1;
                    
                    if (y1Scale && chartArea) {
                        // Dibujar línea de target específico para el proceso
                        const targetValue = FTY_TARGETS[processName];
                        if (targetValue) {
                            const yTarget = y1Scale.getPixelForValue(targetValue);
                            
                            ctx.save();
                            ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
                            ctx.lineWidth = 2;
                            ctx.setLineDash([8, 4]);
                            ctx.beginPath();
                            ctx.moveTo(chartArea.left, yTarget);
                            ctx.lineTo(chartArea.right, yTarget);
                            ctx.stroke();
                            
                            // Agregar etiqueta del target
                            ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
                            ctx.font = 'bold 12px Arial';
                            ctx.textAlign = 'left';
                            ctx.fillText(`Target: ${targetValue}%`, chartArea.left + 5, yTarget - 5);
                            
                            ctx.restore();
                        }
                    }
                }
            }]
        });
    }

    // Modificar createProcessReport para usar los datos correctamente
    function createProcessReport(processName, container) {
        const reportElement = document.createElement('div');
        reportElement.className = 'bg-gray-800 p-6 rounded-lg shadow-lg mb-6';
        reportElement.setAttribute('data-process', processName);
        
        // Obtener métricas del proceso
        const metrics = getProcessMetrics(processName);
        
        reportElement.innerHTML = `
            <h3 class="text-xl font-bold text-white mb-4">Reporte MQS - FTY ${processName}</h3>
            <div class="flex flex-wrap gap-4 mb-6 text-sm">
                <div class="bg-green-600 px-4 py-2 rounded font-semibold" data-metric="fty">
                    FTY%: ${metrics ? metrics.fty : 0}%
                </div>
                <div class="bg-yellow-600 px-4 py-2 rounded font-semibold" data-metric="ntf">
                    NTF%: ${metrics ? metrics.ntf : 0}%
                </div>
                <div class="bg-red-600 px-4 py-2 rounded font-semibold" data-metric="dphu">
                    DPHU%: ${metrics ? metrics.dphu : 0}%
                </div>
            </div>
            <div class="relative h-96 mb-6">
                <canvas data-chart="${processName}"></canvas>
            </div>
        `;

        // Agregar tabla de fallas después del gráfico
        reportElement.innerHTML += `
            <div class="overflow-x-auto mt-6">
                <table class="w-full text-sm text-left text-gray-200">
                    <thead class="text-xs uppercase bg-gray-700">
                        <tr>
                            <th class="px-4 py-3">TestCode</th>
                            <th class="px-4 py-3">Fails</th>
                            <th class="px-4 py-3">Fail %</th>
                            <th class="px-4 py-3">NTF</th>
                            <th class="px-4 py-3">Causas</th>
                            <th class="px-4 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="failures-${processName}">
                        <tr>
                            <td colspan="6" class="px-4 py-3 text-center">
                                <div class="animate-pulse">Loading failures data...</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        container.appendChild(reportElement);
        
        // Crear gráfico y cargar datos de fallas
        setTimeout(async () => {
            createProcessChart(processName);
            
            // Asegurarse de que tenemos los datos de fallas
            if (!window.failuresData) {
                try {
                    window.failuresData = await loadFailuresData();
                } catch (error) {
                    console.error('Error loading failures data:', error);
                }
            }
            
            if (window.failuresData) {
                updateFailuresTable(processName);
            }
        }, 100);
    }

    function updateFailuresTable(processName) {
        const tbody = document.getElementById(`failures-${processName}`);
        if (!tbody || !window.failuresData) {
            console.error(`No tbody found for ${processName} or no failures data available`);
            return;
        }

        try {
            const processFailures = window.failuresData
                .filter(failure => failure.process === processName)
                .sort((a, b) => b.pfail - a.pfail)
                .slice(0, 5);

            if (processFailures.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="px-4 py-3 text-center">
                            No failures found for ${processName}
                        </td>
                    </tr>
                `;
                return;
            }

            // Cargar notas guardadas
            const savedNotes = loadFailureNotes();

            tbody.innerHTML = processFailures.map(failure => {
                const savedProcessNotes = savedNotes[processName]?.[failure.testcode] || {};
                return `
                    <tr class="border-b border-gray-600 hover:bg-gray-700">
                        <td class="px-4 py-3 text-center">${failure.testcode}</td>
                        <td class="px-4 py-3 text-center">${failure.pfail}</td>
                        <td class="px-4 py-3 text-center">${failure.pfailph.formatted}</td>
                        <td class="px-4 py-3 text-center">${failure.pntf || 0}</td>
                        <td class="px-4 py-3">
                            <textarea
                                class="w-full bg-gray-700 text-white px-2 py-1 rounded resize-y min-h-[38px]"
                                placeholder="Ingrese causa"
                                rows="1"
                                data-failure-note
                                data-process="${processName}"
                                data-testcode="${failure.testcode}"
                                data-type="causa"
                                style="overflow-y: hidden;"
                            >${savedProcessNotes.causa || ''}</textarea>
                        </td>
                        <td class="px-4 py-3">
                            <textarea
                                class="w-full bg-gray-700 text-white px-2 py-1 rounded resize-y min-h-[38px]"
                                placeholder="Ingrese acción"
                                rows="1"
                                data-failure-note
                                data-process="${processName}"
                                data-testcode="${failure.testcode}"
                                data-type="accion"
                                style="overflow-y: hidden;"
                            >${savedProcessNotes.accion || ''}</textarea>
                        </td>
                    </tr>
                `;
            }).join('');

            // Agregar función para auto-resize de los textareas
            const adjustTextareaHeight = (textarea) => {
                textarea.style.height = 'auto';
                textarea.style.height = (textarea.scrollHeight) + 'px';
            };

            // Modificar los event listeners para incluir el auto-resize
            tbody.querySelectorAll('textarea[data-failure-note]').forEach(textarea => {
                // Ajustar altura inicial
                adjustTextareaHeight(textarea);
                
                // Event listeners para ajuste automático y guardado
                textarea.addEventListener('input', () => {
                    adjustTextareaHeight(textarea);
                });
                textarea.addEventListener('change', saveFailureNotes);
                textarea.addEventListener('blur', saveFailureNotes);
            });

            // También centrar los encabezados
            const table = tbody.closest('table');
            const headers = table.querySelector('thead tr');
            headers.innerHTML = `
                <th class="px-4 py-3 text-center">TestCode</th>
                <th class="px-4 py-3 text-center">Fails</th>
                <th class="px-4 py-3 text-center">Fail %</th>
                <th class="px-4 py-3 text-center">NTF</th>
                <th class="px-4 py-3 text-center">Causas</th>
                <th class="px-4 py-3 text-center">Acciones</th>
            `;

        } catch (error) {
            console.error(`Error updating failures table for ${processName}:`, error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-3 text-center text-red-500">
                        Error loading failures data
                    </td>
                </tr>
            `;
        }
    }

    // Agregar constante para almacenar las causas y acciones
    const FAILURE_NOTES_KEY = 'explorerAppFailureNotes';

    // Función para guardar notas
    function saveFailureNotes() {
        const notes = {};
        document.querySelectorAll('[data-failure-note]').forEach(input => {
            const processName = input.dataset.process;
            const testcode = input.dataset.testcode;
            const type = input.dataset.type; // 'causa' o 'accion'
            
            if (!notes[processName]) notes[processName] = {};
            if (!notes[processName][testcode]) notes[processName][testcode] = {};
            
            notes[processName][testcode][type] = input.value;
        });
        
        localStorage.setItem(FAILURE_NOTES_KEY, JSON.stringify(notes));
    }

    // Función para cargar notas
    function loadFailureNotes() {
        try {
            const saved = localStorage.getItem(FAILURE_NOTES_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading failure notes:', error);
            return {};
        }
    }

    function getProcessMetrics(processName) {
        const selectedModel = modelFilter?.value;
        if (!selectedModel) return null;

        // 1. Obtener la fecha más reciente de la tabla
        const latestDate = getLatestDateFromTable();
        if (!latestDate) {
            console.log('No se encontró fecha en la tabla');
            return null;
        }

        console.log('Fecha más reciente:', latestDate);

        // 2. Filtrar datos de la API por modelo, proceso y última fecha
        let apiData = allData.filter(item => 
            item.Name === selectedModel && 
            item.Process === processName &&
            item.Date.split('T')[0] === latestDate // Comparar solo la parte de fecha
        );

        console.log(`Datos filtrados para ${processName} en fecha ${latestDate}:`, apiData);

        // 3. Calcular métricas usando solo los datos de la última fecha
        let totalPrimeHandle = 0;
        let totalPrimePass = 0;
        let totalPrimeFail = 0;
        let totalPrimeNTF = 0;
        let totalPrimeDefect = 0;

        apiData.forEach(item => {
            // Convertir valores vacíos a 0
            totalPrimeHandle += parseInt(item['Prime Handle']) || 0;
            totalPrimePass += parseInt(item['Prime Pass']) || 0;
            totalPrimeFail += parseInt(item['Prime Fail']) || 0;
            totalPrimeNTF += parseInt(item['Prime NTF Count']) || 0;
            totalPrimeDefect += parseInt(item['Prime Defect Count']) || 0;
        });

        // Calcular porcentajes
        const ftyPercent = totalPrimeHandle > 0 ? 
            (totalPrimePass * 100) / totalPrimeHandle : 100;

        const ntfPercent = totalPrimeHandle > 0 ? 
            (totalPrimeNTF * 100) / totalPrimeHandle : 0;

        const dphuPercent = totalPrimeHandle > 0 ? 
            (totalPrimeDefect * 100) / totalPrimeHandle : 0;

        return {
            fty: Math.round(ftyPercent * 100) / 100,
            ntf: Math.round(ntfPercent * 100) / 100,
            dphu: Math.round(dphuPercent * 100) / 100
        };
    }

    // Nueva función para obtener la fecha más reciente de la tabla
    function getLatestDateFromTable() {
        const tbody = document.getElementById('line-status-tbody');
        if (!tbody) return null;

        const rows = tbody.querySelectorAll('tr:not(#totals-row)');
        let latestDate = null;

        rows.forEach(row => {
            const dateCell = row.cells[0];
            if (dateCell) {
                const date = dateCell.textContent.trim();
                if (date && (!latestDate || date > latestDate)) {
                    latestDate = date;
                }
            }
        });

        return latestDate;
    }

    // --- 15. EVENT LISTENERS (ACTUALIZADO) ---
    if (modelFilter) {
        modelFilter.addEventListener('change', (e) => {
            console.log('Cambio en dropdown modelo:', e.target.value);
            filterAndUpdateTable();
            
            // Recrear gráficos de procesos después de un breve delay
            setTimeout(() => {
                if (e.target.value) {
                    createProcessReports();
                }
            }, 1000);
        });
    }

    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            console.log('Cambio en dropdown fecha:', e.target.value);
            filterAndUpdateTable();
            
            // Actualizar gráficos cuando cambia el filtro de fecha
            setTimeout(() => {
                if (modelFilter?.value) {
                    createProcessReports();
                }
            }, 1000);
        });
    }

    // Event listener para el botón de limpiar datos
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', (e) => {
            // Confirmar antes de eliminar
            if (confirm('¿Estás seguro de que quieres eliminar todos los datos guardados? Esta acción no se puede deshacer.')) {
                clearManualDataFromStorage();
            }
        });
    }

    // --- 16. ISSUES MANAGEMENT (ACTUALIZADO) ---
    const ISSUES_STORAGE_KEY = 'explorerAppIssues';

    function saveIssuesState() {
        const issuesTableBody = document.getElementById('issues-table-body');
        if (!issuesTableBody) return;

        const issuesState = {};
        const rows = issuesTableBody.querySelectorAll('tr');

        rows.forEach((row, index) => {
            const statusSelect = row.querySelector('[data-status-select]');
            if (statusSelect) {
                const issueId = statusSelect.getAttribute('data-issue-id') || index;
                issuesState[issueId] = {
                    status: statusSelect.value,
                    rowIndex: index
                };
            }
        });

        localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(issuesState));
        console.log('Estado de issues guardado:', issuesState);
    }

    function loadIssuesState() {
        const savedState = localStorage.getItem(ISSUES_STORAGE_KEY);
        if (!savedState) return null;

        try {
            return JSON.parse(savedState);
        } catch (error) {
            console.error('Error al cargar estado de issues:', error);
            return null;
        }
    }

    function applyIssuesState(issuesState) {
        if (!issuesState) return;

        const issuesTableBody = document.getElementById('issues-table-body');
        if (!issuesTableBody) return;

        Object.entries(issuesState).forEach(([issueId, data]) => {
            const select = issuesTableBody.querySelector(`[data-status-select][data-issue-id="${issueId}"]`) ||
                          issuesTableBody.querySelector(`tr:nth-child(${data.rowIndex + 1}) [data-status-select]`);
            
            if (select && data.status) {
                select.value = data.status;
                updateStatusStyle(select);
            }
        });
    }

    const updateStatusStyle = (selectElement) => {
        selectElement.classList.remove('status-open', 'status-ongoing', 'status-closed');
        
        switch (selectElement.value) {
            case 'Open': 
                selectElement.classList.add('status-open'); 
                selectElement.style.backgroundColor = '#dc2626';
                break;
            case 'On going': 
                selectElement.classList.add('status-ongoing');
                selectElement.style.backgroundColor = '#d97706';
                break;
            case 'Closed': 
                selectElement.classList.add('status-closed');
                selectElement.style.backgroundColor = '#059669';
                break;
        }
        selectElement.style.color = 'white';
    };

    if (document.getElementById('issues-table-body')) {
        // Cargar estado guardado al iniciar
        const savedIssuesState = loadIssuesState();
        if (savedIssuesState) {
            applyIssuesState(savedIssuesState);
        }

        // Event listener para cambios en los selects
        document.getElementById('issues-table-body').addEventListener('change', (event) => {
            if (event.target.matches('[data-status-select]')) {
                const select = event.target;
                updateStatusStyle(select);
                
                // Efecto visual
                const row = select.closest('tr');
                row.style.transition = 'background-color 0.3s ease';
                
                switch (select.value) {
                    case 'Closed':
                        row.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                        break;
                    case 'On going':
                        row.style.backgroundColor = 'rgba(217, 119, 6, 0.1)';
                        break;
                    case 'Open':
                        row.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                        break;
                }
                
                setTimeout(() => {
                    row.style.backgroundColor = '';
                }, 1000);

                // Guardar estado después de cada cambio
                saveIssuesState();
            }
        });

        // Guardar estado cuando la página se cierra o se oculta
        window.addEventListener('beforeunload', saveIssuesState);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                saveIssuesState();
            }
        });
    }

    // --- 17. INICIALIZAR (ACTUALIZADO) ---
    console.log('Inicializando aplicación...');
    loadInitialData()
        .then(() => {
            // Inicializar gráficos de procesos después de cargar datos
            if (modelFilter?.value) {
                createProcessReports();
            }
            
            // Iniciar actualización automática
            setupAutoUpdate();
        })
        .catch(error => {
            console.error('Error en inicialización:', error);
        });

    // --- 18. FORM MANAGEMENT ---
    const form = document.getElementById('data-form');
    const submitButton = document.getElementById('submit-button');
    const submitText = document.getElementById('submit-text');
    const submitSpinner = document.getElementById('submit-spinner');
    const statusMessage = document.getElementById('status-message');
    const imageInput = document.getElementById('imagen');
    const imagePreview = document.getElementById('image-preview');

    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => { 
                    imagePreview.src = e.target.result; 
                    imagePreview.classList.remove('hidden'); 
                }
                reader.readAsDataURL(file);
            } else {
                imagePreview.classList.add('hidden');
            }
        });
    }

    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            
            const produccion = document.getElementById('produccion')?.value.trim() || '';
            const ensamblaje = document.getElementById('ensamblaje')?.value.trim() || '';
            const rechazos = document.getElementById('rechazos')?.value.trim() || '';
            
            if (!produccion && !ensamblaje && !rechazos) { 
                showFormStatus('Por favor, complete al menos uno de los campos de detalle.', 'error'); 
                return; 
            }
            
            setFormLoading(true);
            
            const file = imageInput?.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => sendData(reader.result);
                reader.readAsDataURL(file);
            } else {
                sendData(null);
            }
        });
    }
    
    function sendData(base64Image) {
        const formData = { 
            produccion: document.getElementById('produccion')?.value || '', 
            ensamblaje: document.getElementById('ensamblaje')?.value || '', 
            rechazos: document.getElementById('rechazos')?.value || '', 
            imagen: base64Image 
        };
        
        fetch(appScriptUrl, { 
            method: 'POST', 
            mode: 'cors', 
            cache: 'no-cache', 
            headers: {'Content-Type': 'application/json'}, 
            redirect: 'follow', 
            body: JSON.stringify(formData) 
        })
        .then(response => response.json())
        .then(data => { 
            showFormStatus('Reporte enviado con éxito.', 'success'); 
            form?.reset(); 
            if (imagePreview) imagePreview.classList.add('hidden'); 
            setFormLoading(false); 
        })
        .catch((error) => { 
            showFormStatus('Ocurrió un error al enviar el reporte. Inténtalo de nuevo.', 'error'); 
            setFormLoading(false); 
        });
    }

    function setFormLoading(isLoading) {
        if (submitText) submitText.classList.toggle('hidden', isLoading);
        if (submitSpinner) submitSpinner.classList.toggle('hidden', !isLoading);
        if (submitButton) {
            submitButton.disabled = isLoading;
            submitButton.classList.toggle('opacity-50', isLoading);
            submitButton.classList.toggle('cursor-not-allowed', isLoading);
        }
    }

    function showFormStatus(message, type) {
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = 'mt-4 text-center p-3 rounded-md';
            const typeClass = type === 'success' ? 'bg-green-500 text-green-100' : 'bg-red-500 text-red-100';
            statusMessage.classList.add(...typeClass.split(' '));
            statusMessage.classList.remove('hidden');
            setTimeout(() => { 
                statusMessage.classList.add('hidden'); 
            }, 5000);
        }
    }

    // --- 19. AUTO ACTUALIZACIÓN ---
    function setupAutoUpdate() {
        console.log('Configurando actualización automática cada 10 minutos...');
        
        // Función para actualizar datos
        async function updateData() {
            console.log('Iniciando actualización automática...');
            try {
                const response = await fetch(appScriptUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const responseData = await response.json();
                
                if (responseData && responseData.success && responseData.data && Array.isArray(responseData.data)) {
                    // Actualizar datos globales
                    allData = responseData.data.map(item => ({
                        ...item,
                        FormattedDate: formatDate(item.Date)
                    })).filter(item => item.FormattedDate !== null);
                    
                    // Si hay un modelo seleccionado, actualizar la tabla
                    if (modelFilter?.value) {
                        filterAndUpdateTable();
                        createProcessReports();
                    }
                    
                    console.log('Actualización automática completada');
                    showUpdateNotification('Datos actualizados correctamente', 'success');
                }
            } catch (error) {
                console.error('Error en actualización automática:', error);
                showUpdateNotification('Error al actualizar datos', 'error');
            }
        }
        
        // Configurar intervalo de actualización
        const updateInterval = setInterval(updateData, UPDATE_INTERVAL);
        
        // Limpiar intervalo cuando la página se cierra o se oculta
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearInterval(updateInterval);
            } else {
                // Reiniciar intervalo cuando la página vuelve a ser visible
                clearInterval(updateInterval);
                setupAutoUpdate();
            }
        });
        
        // Primera actualización inmediata
        updateData();
    }

    // Función para mostrar notificación de actualización
    function showUpdateNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium 
            transition-all duration-300 transform translate-y-full shadow-lg
            ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
        
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <span class="text-lg">
                    ${type === 'success' ? '✓' : '⚠'}
                </span>
                <span>${message}</span>
                <span class="text-xs opacity-75">
                    (Próxima actualización en 10 min)
                </span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animación de entrada
        requestAnimationFrame(() => {
            notification.classList.remove('translate-y-full');
        });
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.classList.add('translate-y-full');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Constante para la URL de la API de failures
    const FAILURES_API_URL = 'https://script.google.com/macros/s/AKfycbzWtySKBpu3w7GwZIB3fOHYPO93WkEyqMHuYf_lcZe2gN3B7lp-63tRsvpsX8qd50gVRA/exec';

    // Función para cargar los datos de failures
    async function loadFailuresData() {
        try {
            const response = await fetch(FAILURES_API_URL);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                console.log('Failures data loaded successfully:', data.data);
                return data.data;
            } else {
                throw new Error('Failed to load failures data');
            }

        } catch (error) {
            console.error('Error loading failures data:', error);
            return null;
        }
    }

    // Función para inicializar la carga de datos
    async function initializeFailuresData() {
        const failuresData = await loadFailuresData();
        if (failuresData) {
            // Almacenar los datos globalmente para uso posterior
            window.failuresData = failuresData;
            console.log('Failures data initialized and stored');
        }
    }

    // Llamar a la función de inicialización cuando se carga el documento
    document.addEventListener('DOMContentLoaded', initializeFailuresData);
});