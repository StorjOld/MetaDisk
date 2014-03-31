
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
        stuff.push(file)
        Cookies.set('history', JSON.stringify(stuff))
    ),
    get: (-> JSON.parse(Cookies.get('history'))),
    kill: (-> Cookies.kill('history'))
}

loadStats = ->
    $.getJSON api('storage/size-limit'), (file_limit) ->
        file_limit.size /= GIGABYTE
        $('#cont-file-size-limit').html(file_limit.size.toFixed(2) + ' GB')

    $.getJSON api('bandwidth/usage'), (usage) ->
        usage.current.incoming /= GIGABYTE
        usage.current.outgoing /= GIGABYTE

        $.getJSON api('bandwidth/limits'), (limits) ->
            if limits.incoming is 0
                $('#bar-ul-bandwidth').css('width', '0%')
                $('#cont-ul-bandwidth').html(usage.current.incoming.toFixed(2) + '/&infin; GB')
            else
                limits.incoming /= GIGABYTE
                $('#bar-ul-bandwidth').css('width', (usage.current.incoming / limits.incoming * 100) + '%')
                $('#cont-ul-bandwidth').text(usage.current.incoming.toFixed(2) + '/' + limits.incoming.toFixed(2) + ' GB')

            if limits.outgoing is 0
                $('#bar-dl-bandwidth').css('width', '0%')
                $('#cont-dl-bandwidth').html(usage.current.outgoing.toFixed(2) + '/&infin; GB')
            else
                limits.outgoing /= GIGABYTE
                $('#bar-dl-bandwidth').css('width', (usage.current.outgoing / limits.outgoing * 100) + '%')
                $('#cont-dl-bandwidth').text(usage.current.outgoing.toFixed(2) + '/' + limits.outgoing.toFixed(2) + ' GB')

    $.getJSON api('storage/usage'), (usage) ->
        usage = usage.usage / GIGABYTE

        $.getJSON api('storage/capacity'), (capacity) ->
            capacity = capacity.capacity / GIGABYTE

            $('#bar-storage').css('width', (usage / capacity * 100) + '%')
            $('#cont-storage').text(usage.toFixed(2) + '/' + capacity.toFixed(2) + ' GB')

    $.getJSON api('dtc/address'), (addr) ->
        $('#cont-datacoin-addr')
            .html('<code>' + addr.address + '</code>')
            .find('code').click ->
                selectElementText($(this)[0])

    $.getJSON api('dtc/balance'), (balance) ->
        $('#cont-datacoin-bal').text(balance.balance + ' DTC')

    $.getJSON api('sync/status'), (data) ->
        cloudSize = 0
        for size in (x.filesize for x in data.cloud_queue)
            cloudSize += size / GIGABYTE

        bcSize = 0
        for size in (x.filesize for x in data.blockchain_queue)
            bcSize += size / GIGABYTE

        $('#cont-sync-cloud').text(data.cloud_queue.length + ' (' + cloudSize.toFixed(2) + ' GB)')
        $('#cont-sync-blockchain').text(data.blockchain_queue.length + ' (' + bcSize.toFixed(2) + ' GB)')

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
        .prependTo($('#cont-file-list'))

    $file.find('button.btn-dl').click ->
        window.location.href = api('download/' + file.fhash)

    $file.find('button.btn-copy-url').zclip(
      path: '/js/ZeroClipboard.swf',
      copy: -> return api('download/' + file.fhash)
    )

    $file.find('code').zclip(
      path: '/js/ZeroClipboard.swf',
      copy: -> return $(this).html()
    )

makeHandler = (fname) ->
    (fhash) ->
        fhash = fhash.filehash

        History.add({fname: fname, fhash: fhash})

        showUploadStage('uploaded')
        $('#span-dl-link').val(api('download/' + fhash))

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

# select the link when the user focuses or clicks
$('#span-dl-link').focus -> $(this).select()
$('#span-dl-link').click -> $(this).select()

$('#btn-upload-another').click ->
    showUploadStage('upload')

# load history

files = History.get()

currentPage = ->
    return parseInt($('#cont-pagination').attr('data-current'))

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
