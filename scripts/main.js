
const domContentEmb = {
  menuDropdown: () => {
    return '<div id="__ch_menu_area" xmlns="http://www.w3.org/1999/html">' +
      '<button type="button" class="btn-circle btn-sm menu_ha_ch_icon"><span id="display_selected_rows"></span></button>' +
      '<div class="ch_ha_setting" style="display: none;">' +
      '<div style="color: white"><button type="button" class="close_action" ><span aria-hidden="true" style="color: white">X</span></button><h3 style="padding-left: 20px">HA Exporter</h3></div>' +
      '<p><span class="selected_auction_count"></span><span class="message_item_added"> Items Added!</span></p>' +
      '<div class="configuration_area">' +
      '<div><button type="button" class="btnc btn-block _CC disabled" id="ch_clear"> Reset</button></div>' +
      '<p><input type="checkbox" class="ch_select ch_excel" value="ch_excel"> <label>Save as Excel</label></p>' +
      '<p><input type="checkbox" class="ch_select ch_csv" value="ch_csv"> <label>Save as CSV</label></p>' +
      '</div>' +
      '<div><button type="button" class="btnc btn-block _CH disabled" id="ch_export">Export</button></div>' +
      '</div></div></div>';
  },
  listingAddButton: async (el)=>{
    let lot_number = 0;
    if($(el).hasClass('list')){
      let au_lot = $(el).find('div.item-info > p').text();
      let lot_string = au_lot.split('|')[1].split('»')[0].replace('Lot', '').trim();
      lot_number = parseInt(lot_string);
    }
    else if($(el).hasClass('gallery')){
      let au_lot = $(el).find('div.lotno').text();
      let lot_string = au_lot.split('|')[1].replace('Lot:', '').trim();
      lot_number = parseInt(lot_string);
    }
    let data = await exporterDropdown.data();
    const found = data.some(el => el[0] === lot_number);
    if(found){
      $(el).append('<div class="ch_auction_item_container"><div class="btn ch_remove_item"><span class="add">+ Add</span><span class="remove">- Remove</span></div></div>');
    }
    else{
      $(el).append('<div class="ch_auction_item_container"><div class="btn ch_add_item"><span class="add">+ Add</span><span class="remove">- Remove</span></div></div>');
    }
  },
}

const haLoadListing = {
  init: async function(){
    try{
      //Add the dropDown Button of Chrome extension menu UI
      $('#__ch_menu_area').length? '': await exporterDropdown.render();

      //Add the Add/Remove Buttons to all items
      if($('ul.auction-items li.item-block').length){
        $('ul.auction-items li.item-block').each((id, el) => {
          domContentEmb.listingAddButton(el)
        })
      }
      $(document.body).on('click', '.ch_auction_item_container div.btn',  function (e) {
        e.preventDefault();
        let description = '';
        let lot_number = 0;
        let row_container = $(this).closest('li.item-block');
        if($(row_container).hasClass('list')){
          let header = $(row_container).find('a.item-title').text();
          header = header.slice(0, -4);
          let au_lot = $(row_container).find('div.item-info > p').text();
          let lot_information = $(row_container).find('div.data-block').parent('.info-columns').text();
          let lot_string = au_lot.split('|')[1].split('»')[0].replace('Lot', '').trim();
          lot_number = parseInt(lot_string);
          description = header + ' ' + au_lot + ' ' + lot_information;
          description = "\"" + description.replace(/(\r\n|\n|\r)/gm, " ") + "\"";
        }
        else if($(row_container).hasClass('gallery')){
          let header = $(row_container).find('a.item-title').text();
          header = header.slice(0, -4);
          let au_lot = $(row_container).find('div.lotno').text();
          let lot_string = au_lot.split('|')[1].replace('Lot:', '').trim();
          lot_number = parseInt(lot_string);
          description = header + ' ' + au_lot.split('|')[0];
          description = "\"" + description.replace(/(\r\n|\n|\r)/gm, " ") + "\"";
        }
        try{
          if($(this).hasClass('ch_add_item')){
            $(this).removeClass('ch_add_item');
            $(this).addClass('ch_remove_item');
            if(lot_number && description) exporterDropdown.updateExporter([lot_number, description])
          }
          else if ($(this).hasClass('ch_remove_item')){
            $(this).addClass('ch_add_item');
            $(this).removeClass('ch_remove_item');
            if(lot_number) exporterDropdown.removeData(lot_number);
          }
        }
        catch (e) {
        }
      });
    }
    catch (e) {
      console.log(e);
    }
  },

};

const exporterDropdown = {
  render: ()=>{
    return new Promise(async (resolve, reject)=>{
      try{
        let $dropDownwidget = domContentEmb.menuDropdown();
        $(document.body).prepend($dropDownwidget);

        $(document.body).on('click','.menu_ha_ch_icon', ()=>{
          $('.menu_ha_ch_icon').hide();
          $('.ch_ha_setting').fadeIn();
        });
        $(document.body).on('click', '.close_action', ()=>{
          $('.ch_ha_setting').hide();
          $('.menu_ha_ch_icon').fadeIn();
        });
        $(window).click(function() {
          $('.ch_ha_setting').hide();
          $('.menu_ha_ch_icon').fadeIn();
        });

        $(document.body).on('click', '#__ch_menu_area', function(event){
          event.stopPropagation();
        });
        $(document.body).on('input', '#ch_google_sheet_url', function () {
          exporterDropdown.validateSheetUrl()
        });


        $(document.body).on('click', '.ch_select', function () {
          var selected = [];
          $('.ch_select:checked').each((i,e) => {
            selected.push($(e).val());
          });
          chrome.storage.local.set({
            'ch_ha_selected_options': selected
          }, function() {
            // console.log(selected);
            exporterDropdown.update_dropDown_menu();
          });
        });

        $(document.body).on('click', '#ch_clear', function () {
          exporterDropdown.update_storage_data([]);
          $('ul.auction-items li.item-block .ch_auction_item_container').remove();
          $('ul.auction-items li.item-block').each((id, el) => {
            domContentEmb.listingAddButton(el)
          })
        });
        $(document.body).on('click', '#ch_export',async ()=>{
          /**
           * Export CSV
           */

          const header = [['lot_number', 'description']];

          if($('input.ch_csv').is(':checked')){
            let data = await exporterDropdown.data();
            data = header.concat(data);
            // console.log(data.map(e => e.join(",")).join("\r\n"));
            let blob_data = new TextEncoder('utf-16be').encode(data.map(e => e.join(",")).join("\r\n"));

            // create a Blob object for the download
            let blob = new Blob(['\uFEFF', blob_data], {
              type: 'text/csv;charset=utf-8'
            });
            exporterDropdown.download_file(blob, 'data.csv');
          }
          if($('input.ch_excel').is(':checked')){
            var wb = XLSX.utils.book_new();
            wb.SheetNames.push("new_table");
            let ws_data = await exporterDropdown.data();
            ws_data = header.concat(ws_data);
            let ws = await XLSX.utils.aoa_to_sheet(ws_data);
            wb.Sheets["new_table"] = ws;
            let wbout = await XLSX.write(wb, {bookType:'xlsx',  type: 'binary'});
            let blob_xlsx = new Blob([exporterDropdown.ch_s2ab(wbout)],{type:"application/octet-stream"});
            exporterDropdown.download_file(blob_xlsx, 'data.xlsx');
          }

          if($('input.ch_google_drive').is(':checked')){
            chrome.storage.local.get(['ch_ha_sheet_url'],async function(storageObject) {
              try{
                let data = await exporterDropdown.data();
                data = header.concat(data);
                $('.ch_error_message').text('Processing...');
                if(storageObject.hasOwnProperty('ch_ha_sheet_url')){
                  let spreadsheetId = new RegExp("/spreadsheets/d/([a-zA-Z0-9-_]+)").exec(storageObject.ch_ha_sheet_url)[1];
                  chrome.runtime.sendMessage({ action: 'addDataToSheet', spreadsheetId: spreadsheetId, data: data }, response => {
                    if(response != null && response.status && response.status === 'failed'){
                      throw new Error(response.message)
                    }
                    else if(response.status == 'done'){
                      //
                      $('.ch_error_message').text('Copied to Google Sheet!');
                      setTimeout(function(){
                        $('.ch_error_message').text('');
                      }, 6000);
                    }
                  });
                }
                else{
                  throw new Error('Invalid SheetID')
                }
              }
              catch (e) {
                $('.ch_error_message').text(e.message);
              }
            });
          }

        });

        await exporterDropdown.initExporterStatus();
        exporterDropdown.update_dropDown_menu();
        resolve();
      }
      catch (e) {
      }
    });
  },
  download_file: (blob,  filename) =>{
    if (typeof navigator.msSaveOrOpenBlob === 'function') {
      navigator.msSaveOrOpenBlob(blob, filename);
    } else {
      // this trick will generate a temp <a /> tag that you can trigger a hidden click for it to start downloading
      const link = document.createElement('a');
      const csvUrl = URL.createObjectURL(blob);

      link.textContent = 'download';
      link.href = csvUrl;
      link.setAttribute('download', filename);

      // set the visibility hidden so there is no effect on your web-layout
      link.style.visibility = 'hidden';

      // this part will append the anchor tag and remove it after automatic click
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },
  ch_s2ab: (s) => {
    var buf = new ArrayBuffer(s.length); //convert s to arrayBuffer
    var view = new Uint8Array(buf);  //create uint8array as viewer
    for (var i=0; i<s.length; i++) view[i] = s.charCodeAt(i) & 0xFF; //convert to octet
    return buf;
  },
  initExporterStatus: () => {
    return new Promise((resolve, reject) => {
      this.status = true;
      $('.menu_ha_ch_icon').removeClass('selected_auction');
      chrome.storage.local.get(['ch_ha_sheet_url', 'ch_ha_selected_options'], function(storageObject) {
        if(storageObject.hasOwnProperty('ch_ha_sheet_url')){
          $('#ch_google_sheet_url').val(storageObject.ch_ha_sheet_url);
          $('.ch_error_message').text('Valid URL');
          $('a.ch_goto_sheet').attr('href', storageObject.ch_ha_sheet_url);
        }

        if(storageObject.hasOwnProperty('ch_ha_selected_options')){
          let selected = storageObject.ch_ha_selected_options;
          selected.forEach((e) => {
            $('.ch_select.' + e).prop('checked', true);
          })
        }
        resolve()
      });
    });
  },
  data: ()=>{
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['ch_ha_selected_rows'], function(storageObject) {
        if(storageObject.hasOwnProperty('ch_ha_selected_rows')){
          resolve(storageObject.ch_ha_selected_rows);
        }
        else{
          resolve([])
        }
      });
    })
  },
  update_storage_data: (new_data) => {
    chrome.storage.local.set({
      'ch_ha_selected_rows': new_data
    }, function() {
      console.log('save');
      exporterDropdown.update_dropDown_menu();
    });
  },
  updateExporter: async (row)=>{
    let data = await exporterDropdown.data();
    const found = data.some(el => el[0] === row.lot_no);
    if(!found) {
      data.push(row);
      exporterDropdown.update_storage_data(data);
    }
  },
  update_dropDown_menu: async ()=>{
    let data = await exporterDropdown.data();
    var selected = [];
    $('.ch_select:checked').each((i, e) => {
      selected.push($(e).val());
    });
    if(data.length){
      $('._CC').removeClass('disabled');
    }
    else{
      $('._CC').addClass('disabled');
    }
    if(data.length && selected.length){
      $('.menu_ha_ch_icon').addClass('selected_auction');
      $('._CH').removeClass('disabled');
    }
    else{
      $('.menu_ha_ch_icon').removeClass('selected_auction');
      $('._CH').addClass('disabled');
    }

    if($('.ch_google_drive').prop('checked') == true){
      $('.google_sheet_area').removeClass('disabled');
    }
    else{
      $('.google_sheet_area').addClass('disabled');
    }

    $('span.selected_auction_count').text(data.length);
    $('span#display_selected_rows').text(data.length);
    exporterDropdown.validateSheetUrl('start');
  },
  removeData: async (lot_no) => {
    let data = await exporterDropdown.data();
    data = data.filter( el => el[0] !== lot_no);
    exporterDropdown.update_storage_data(data);
    exporterDropdown.update_dropDown_menu();
  },
  validateSheetUrl: async (_step)=>{
    let data = await exporterDropdown.data();
    if(!data.length) {
      $('._CG').addClass('disabled');
      return $('.ch_error_message').val('No item added');
    }

    let sheetURL = $('#ch_google_sheet_url').val();
    if(sheetURL) {
      try{
        let spreadsheetId = new RegExp("/spreadsheets/d/([a-zA-Z0-9-_]+)").exec(sheetURL)[1];
        if(spreadsheetId){
          if( _step !== 'start'){
            chrome.storage.local.set({
              'ch_ha_sheet_url': sheetURL
            }, function() {
              // console.log('save');
            });
          }
          $('._CG').removeClass('disabled');
          $('.ch_error_message').text('Valid URL');
          $('a.ch_goto_sheet').attr('href', sheetURL);
          $('a.ch_goto_sheet').show();
          return true;
        }
      }
      catch (e) {
      }
      $('.ch_error_message').text('Invalid Sheet URL');
    }else{
      $('.ch_error_message').val('Empty URL');
    }
    $('._CG').addClass('disabled');
    $('a.ch_goto_sheet').hide();
    return false;
  }
}

haLoadListing.init();