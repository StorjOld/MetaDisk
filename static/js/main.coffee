
api = (resource) ->
    'http://node2.storj.io/api/' + resource

GIGABYTE = 1024 * 1024 * 1024

Cookies = {
    set: ((k, v, days) ->
        if days
            date = new Date()
            secs = days * 24 * 60 * 60 * 1000
            date.setTime(date.getTime() + secs)
            expires = '; expires=' + date.toGMTString() + '; max-age=' + secs
        else
            expires = ''

        document.cookie = k + '=' + v + expires + '; path=/'
    ),

    get: ((k) ->
        cookies = document.cookie.split(';')
        for cookie in cookies

            cookie = cookie.trim()
            index = cookie.indexOf('=')
            [name, v] = [cookie.substring(0, index), cookie.substring(index + 1)]

            if name is k
                return v
        null
    ),

    kill: ((k) ->
        this.set(k, '', -11)
    )
}

History = {
    add: ((file) ->
        stuff = JSON.parse(Cookies.get('history')) or []
        stuff.unshift(file)
        Cookies.set('history', JSON.stringify(stuff))
    ),
    get: (-> JSON.parse(Cookies.get('history'))),
    kill: (-> Cookies.kill('history'))
}

gigabytes = (bytes) ->
    (bytes / GIGABYTE).toFixed(2) + ' GB'

gigabytes_ratio = (bytes, total) ->
    if total is 0
        (bytes / GIGABYTE).toFixed(2) + '/&infin; GB'
    else
        (bytes / GIGABYTE).toFixed(2) + '/' + gigabytes(total)

percentage = (bytes, total) ->
    if total is 0
        '0%'
    else
        (100 * bytes / total) + '%'

loadStats = ->
    $.getJSON api('status'), (info) ->
        $('#cont-file-size-limit').html(gigabytes(info.storage.max_file_size))

        $('#bar-ul-bandwidth').css('width', percentage(info.bandwidth.current.incoming, info.bandwidth.limits.incoming))
        $('#cont-ul-bandwidth').html(gigabytes_ratio(info.bandwidth.current.incoming, info.bandwidth.limits.incoming))

        $('#bar-dl-bandwidth').css('width', percentage(info.bandwidth.current.outgoing, info.bandwidth.limits.outgoing))
        $('#cont-dl-bandwidth').html(gigabytes_ratio(info.bandwidth.current.outgoing, info.bandwidth.limits.outgoing))

        $('#bar-storage').css('width', percentage(info.storage.used, info.storage.capacity))
        $('#cont-storage').text(gigabytes_ratio(info.storage.used, info.storage.capacity))

        $('#cont-datacoin-bal').text(info.datacoin.balance + ' DTC')
        $('#cont-datacoin-addr')
            .html('<code>' + info.datacoin.address + '</code>')
            .find('code').click ->
                selectElementText($(this)[0])

        $('#cont-sync-cloud').text(info.sync.cloud_queue.count + ' (' + gigabytes(info.sync.cloud_queue.size) + ')')
        $('#cont-sync-blockchain').text(info.sync.blockchain_queue.count + ' (' + gigabytes(info.sync.blockchain_queue.size) + ')')

loadStats()

showUploadStage = (stage) ->
    # hide all three
    $('#cont-upload').hide()
    $('#cont-uploaded').hide()
    $('#cont-uploading').hide()

    # show the one we want
    $('#cont-' + stage).show()

selectElementText = (el, win) ->
    win = win or window
    doc = win.document

    if win.getSelection and doc.createRange
        sel = win.getSelection()
        range = doc.createRange()
        range.selectNodeContents(el)
        sel.removeAllRanges()
        sel.addRange(range)

    else if doc.body.createTextRange
        range = doc.body.createTextRange()
        range.moveToElementText(el)
        range.select()

downloadUrl = (file) ->
    api('download/' + file.hash)


addFile = (file) ->
    $file = $('<div/>')
        .addClass('file-row cf')
        .append(
            $('<div/>')
                .addClass('left')
                .append('<div class="name">' + file.fname + '</div>')
                .append('<div class="hash"><code>' + file.fhash + '</code></div>')
        )
        .append(
            $('<div/>')
                .addClass('right')
                .append('<button class="btn btn-dl"><i class="fa fa-download"></i>Download</button>')
        )
        .append(
            $('<div/>')
                .addClass('right')
                .append('<button class="btn btn-copy-url"><i class="fa fa-clipboard"></i>Copy URL</button>')
        )
        .appendTo($('#cont-file-list'))

    $file.find('button.btn-dl').click ->
        window.location.href = downloadUrl(file)

    $file.find('button.btn-copy-url').zclip(
      path: '/js/ZeroClipboard.swf',
      copy: -> return downloadUrl(file)
    )

    $file.find('code').zclip(
      path: '/js/ZeroClipboard.swf',
      copy: -> return $(this).html()
    )

makeHandler = (fname) ->
    (response) ->
        file = {fname: fname, fhash: response.filehash}
        History.add(file)

        showUploadStage('uploaded')
        $('#span-dl-link').val(downloadUrl(file))

        page = currentPage()
        initFilePages()
        pickFilePage(page)
        loadStats()

# when a file is selected
$('#in-upload').change ->
    uploadFiles(this.files)

uploadFiles = (files) ->
    for file in files
        uploadFile(file)

uploadFile = (file) ->
    fname = file.name

    formData = new FormData()
    formData.append('file', file)

    showUploadStage('uploading')

    $('#span-up-prog')
        .css('width', '0%')
        .text('0%')

    progressHandler = (e) ->
        perc = (e.loaded / e.total * 100)
        $('#span-up-prog')
            .css('width', perc + '%')
            .text(Math.round(perc) + '%')

    $.ajax {
        url: api('upload'),
        type: 'POST',
        xhr: (->
            xhr = $.ajaxSettings.xhr()
            if xhr.upload
                xhr.upload.addEventListener('progress', progressHandler, false)
            xhr
        ),
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        success: makeHandler(fname),
    }

# Drag and drop support
$('body').on('dragenter',
  ((e) ->
      e.preventDefault()
      e.stopPropagation()))

$('body').on('dragover',
  ((e) ->
      e.preventDefault()
      e.stopPropagation()))

$('body').on('drop',
  ((e) ->
      uploadFiles(e.originalEvent.dataTransfer.files)

      e.preventDefault()
      e.stopPropagation()))

# Searching
$('.searchbox input[name=search]').keypress (e) ->
    if e.which == 13
        window.location.href = api('download/' + $(e.target).val())

# select the link when the user focuses or clicks
$('#span-dl-link').focus -> $(this).select()
$('#span-dl-link').click -> $(this).select()

$('#btn-upload-another').click ->
    showUploadStage('upload')

# load history

files = History.get()

currentPage = ->
    return parseInt($('#cont-pagination').attr('data-current')) | 0

pageCount = ->
    return parseInt((History.get().length + 9) / 10)

pickPagination = (page) ->
    $('#cont-pagination').attr('data-current', page)
    $('#cont-pagination button').each ->
        found = false
        if not isNaN($(this).attr('data-id'))
            if parseInt($(this).attr('data-id')) is page
                found = true

        $(this).prop('disabled', found)

pickFilePage = (page) ->
    if page is "next"
        page = Math.min(currentPage() + 1, pageCount()-1)

    if page is "prev"
        page = Math.max(0, currentPage() - 1)

    page = parseInt(page)

    $('#cont-file-list').empty()
    for file in History.get()[page * 10...(page + 1) * 10]
        addFile(file)

    pickPagination(page)

initFilePages = ->
    $cont = $('#cont-pagination')
    $cont.empty()

    $cont.append('<button data-id="prev" type="button" class="btn btn-default"><i class="fa fa-arrow-circle-left"></i></button>')

    for i in [0...pageCount()]
        $cont.append('<button data-id="' + i + '" type="button" class="btn btn-default">' + (i + 1) + '</button>')

    $cont.append('<button data-id="next" type="button" class="btn btn-default"><i class="fa fa-arrow-circle-right"></i></button>')

    $cont.find('button').click ->
        pickFilePage($(this).attr('data-id'))
    pickFilePage(0)

initFilePages()
