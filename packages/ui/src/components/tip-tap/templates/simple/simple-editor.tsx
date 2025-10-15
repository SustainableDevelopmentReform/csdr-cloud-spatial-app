'use client'

import * as React from 'react'
import {
  Content,
  EditorContent,
  EditorContext,
  Extensions,
  useEditor,
} from '@tiptap/react'

// --- Tiptap Core Extensions ---
import { StarterKit } from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { TextAlign } from '@tiptap/extension-text-align'
import { Typography } from '@tiptap/extension-typography'
import { Highlight } from '@tiptap/extension-highlight'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { Selection } from '@tiptap/extensions'

// --- UI Primitives ---
import { Button } from '@repo/ui/components/tip-tap/ui-primitive/button'
import { Spacer } from '@repo/ui/components/tip-tap/ui-primitive/spacer'
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from '@repo/ui/components/tip-tap/ui-primitive/toolbar'

// --- Tiptap Node ---
import { ImageUploadNode } from '@repo/ui/components/tip-tap/node/image-upload-node/image-upload-node-extension'
import { ChartNode } from '@repo/ui/components/tip-tap/node/chart-node/chart-node-extension'
import type { ChartFormBuilder } from '@repo/ui/components/tip-tap/node/chart-node/chart-node-shared'
import { HorizontalRule } from '@repo/ui/components/tip-tap/node/horizontal-rule-node/horizontal-rule-node-extension'
import '@repo/ui/components/tip-tap/node/blockquote-node/blockquote-node.scss'
import '@repo/ui/components/tip-tap/node/code-block-node/code-block-node.scss'
import '@repo/ui/components/tip-tap/node/horizontal-rule-node/horizontal-rule-node.scss'
import '@repo/ui/components/tip-tap/node/list-node/list-node.scss'
import '@repo/ui/components/tip-tap/node/image-node/image-node.scss'
import '@repo/ui/components/tip-tap/node/heading-node/heading-node.scss'
import '@repo/ui/components/tip-tap/node/paragraph-node/paragraph-node.scss'
import '@repo/ui/components/tip-tap/node/chart-node/chart-node.scss'

// --- Tiptap UI ---
import { HeadingDropdownMenu } from '@repo/ui/components/tip-tap/ui/heading-dropdown-menu'
import { ImageUploadButton } from '@repo/ui/components/tip-tap/ui/image-upload-button'
import { ChartButton } from '@repo/ui/components/tip-tap/ui/chart-button'
import { ListDropdownMenu } from '@repo/ui/components/tip-tap/ui/list-dropdown-menu'
import { BlockquoteButton } from '@repo/ui/components/tip-tap/ui/blockquote-button'
import { CodeBlockButton } from '@repo/ui/components/tip-tap/ui/code-block-button'
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from '@repo/ui/components/tip-tap/ui/color-highlight-popover'
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from '@repo/ui/components/tip-tap/ui/link-popover'
import { MarkButton } from '@repo/ui/components/tip-tap/ui/mark-button'
import { TextAlignButton } from '@repo/ui/components/tip-tap/ui/text-align-button'
import { UndoRedoButton } from '@repo/ui/components/tip-tap/ui/undo-redo-button'

// --- Icons ---
import { ArrowLeftIcon } from '@repo/ui/components/tip-tap/icons/arrow-left-icon'
import { HighlighterIcon } from '@repo/ui/components/tip-tap/icons/highlighter-icon'
import { LinkIcon } from '@repo/ui/components/tip-tap/icons/link-icon'

// --- Hooks ---
import { useIsMobile } from '@repo/ui/hooks/use-mobile'
import { useWindowSize } from '@repo/ui/hooks/use-window-size'
import { useCursorVisibility } from '@repo/ui/hooks/use-cursor-visibility'

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from '@repo/ui/lib/tiptap-utils'

// --- Styles ---
import '@repo/ui/components/tip-tap/templates/simple/simple-editor.scss'

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
  showChartButton,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
  showChartButton: boolean
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu
          types={['bulletList', 'orderedList', 'taskList']}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        {/* <ImageUploadButton text="Add" /> */}
        {showChartButton && <ChartButton text="Chart" />}
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}
    </>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: 'highlighter' | 'link'
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === 'highlighter' ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === 'highlighter' ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)

type SimpleEditorProps = {
  onUpdate: (json: any) => void
  content: Content
  chartFormBuilder?: ChartFormBuilder
}

export function SimpleEditor({
  onUpdate,
  content,
  chartFormBuilder,
}: SimpleEditorProps) {
  const isMobile = useIsMobile()
  const { height } = useWindowSize()
  const [mobileView, setMobileView] = React.useState<
    'main' | 'highlighter' | 'link'
  >('main')
  const toolbarRef = React.useRef<HTMLDivElement>(null)

  const extensions = React.useMemo(() => {
    const baseExtensions: Extensions = [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      // Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      // ImageUploadNode.configure({
      //   accept: 'image/*',
      //   maxSize: MAX_FILE_SIZE,
      //   limit: 3,
      //   upload: handleImageUpload,
      //   onError: (error) => console.error('Upload failed:', error),
      // }),
    ]

    if (chartFormBuilder) {
      baseExtensions.push(
        ChartNode.configure({
          formBuilder: chartFormBuilder,
        }),
      )
    }

    return baseExtensions
  }, [chartFormBuilder])

  const editor = useEditor({
    onUpdate: (props) => {
      onUpdate(props.editor.state.doc.toJSON())
    },

    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
        'aria-label': 'Main content area, start typing to enter text.',
        class: 'simple-editor',
      },
    },
    extensions,
    content,
  })

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  })

  React.useEffect(() => {
    if (!isMobile && mobileView !== 'main') {
      setMobileView('main')
    }
  }, [isMobile, mobileView])

  return (
    <div className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={{
            ...(isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : {}),
          }}
        >
          {mobileView === 'main' ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView('highlighter')}
              onLinkClick={() => setMobileView('link')}
              isMobile={isMobile}
              showChartButton={Boolean(chartFormBuilder)}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === 'highlighter' ? 'highlighter' : 'link'}
              onBack={() => setMobileView('main')}
            />
          )}
        </Toolbar>

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  )
}
