import React from "react";
import {
  $applyNodeReplacement,
  DecoratorNode,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  LexicalUpdateJSON,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
} from "lexical";
import WaveSurfer from "wavesurfer.js";

export const AUDIO_BUTTON_MARKER = "audio-button";
export const AUDIO_BUTTON_VERSION = 1;
export const AUDIO_BUTTON_CLASS_NAME = "audio-button-node";
export type AudioButtonMarker = typeof AUDIO_BUTTON_MARKER;

export type SerializedAudioButtonNode = Spread<
  {
    type: string;
    url: string;
    marker: AudioButtonMarker;
    version: number;
    parent?: string;
  },
  SerializedLexicalNode
>;

// Type for media player props
interface MediaPlayerProps {
  url: string;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

// WaveSurfer component for audio files
function WaveSurferComponent({
  url,
  isPlaying,
  setIsPlaying,
}: MediaPlayerProps): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const waveSurferRef = React.useRef<WaveSurfer | null>(null);
  console.log(url);
  React.useEffect(() => {
    if (!containerRef.current) return;

    // Destroy previous instance if exists
    if (waveSurferRef.current) {
      waveSurferRef.current.destroy();
      waveSurferRef.current = null;
    }

    // Create a WaveSurfer instance without immediately loading a URL
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#22D3EE",
      progressColor: "#000000",
      height: 30,
      hideScrollbar: true,
      interact: true,
      normalize: false,
      backend: "WebAudio",
      mediaControls: true,
      dragToSeek: true,
    });

    // Setup event handlers
    ws.on("ready", () => {
      if (isPlaying) {
        ws.play();
      }
    });

    ws.on("finish", () => {
      setIsPlaying(false);
    });

    ws.on("error", (err) => {
      console.error("WaveSurfer error:", err);
    });

    ws.on("click", () => {
      if (ws.isPlaying()) {
        ws.pause();
        setIsPlaying(false);
      } else {
        ws.play();
        setIsPlaying(true);
      }
    });

    waveSurferRef.current = ws;
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        const blob = new Blob([arrayBuffer]);
        const blobUrl = URL.createObjectURL(blob);

        console.log("Blob URL:", blobUrl);

        if (waveSurferRef.current) {
          waveSurferRef.current.load(blobUrl);
        }
      })
      .catch((error) => {
        console.error("Fetch error:", error);
      });

    return () => {
      ws.destroy();
    };
  }, [setIsPlaying]);

  React.useEffect(() => {
    if (!waveSurferRef.current) return;

    if (isPlaying && !waveSurferRef.current.isPlaying()) {
      waveSurferRef.current.play();
    } else if (!isPlaying && waveSurferRef.current.isPlaying()) {
      waveSurferRef.current.pause();
    }
  }, [isPlaying]);

  return (
    <div style={{ width: "100%" }}>
      <div
        ref={containerRef}
        style={{
          height: "40px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      />
    </div>
  );
}

// Props for Audio Button Component
interface AudioButtonComponentProps {
  url: string;
  nodeKey: NodeKey;
}

// Audio Button Component with hooks moved into this component
function AudioButtonComponent({ url, nodeKey }: AudioButtonComponentProps): React.ReactElement {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [showPlayer, setShowPlayer] = React.useState<boolean>(false);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const [isHovering, setIsHovering] = React.useState<boolean>(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Toggle the popup player
  const togglePlayer = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setShowPlayer(!showPlayer);
  };

  // Play/pause the audio
  const togglePlayPause = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  // Handle deletion of the node
  const onDelete = React.useCallback((): boolean => {
    if (isSelected && $isNodeSelection($getSelection())) {
      const node = $getNodeByKey(nodeKey);
      if (node && $isAudioButtonNode(node)) {
        node.remove();
        return true;
      }
    }
    return false;
  }, [isSelected, nodeKey]);

  // Register event listeners for selection and deletion
  React.useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          if (event.target === ref.current || ref.current?.contains(event.target as Node)) {
            if (!event.shiftKey) {
              clearSelection();
              setSelected(true);
              return true;
            }
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
    );
  }, [clearSelection, editor, isSelected, nodeKey, setSelected, onDelete]);

  // Play Icon SVG
  const PlayIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  );

  // Pause Icon SVG
  const PauseIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="4" width="4" height="16"></rect>
      <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
  );

  // Arrow Icon SVG
  const ArrowIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );

  return (
    <div
      ref={ref}
      style={{
        display: "inline-flex",
        // position: "relative",
        outline: isSelected ? "2px solid #3B82F6" : "none",
        marginLeft: "2px",
        marginRight: "2px",
        verticalAlign: "middle",
        lineHeight: "normal",
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <div
          onClick={togglePlayPause}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px",
            backgroundColor: "#8B5CF6",
            color: "white",
            borderRadius: "4px",
            cursor: "pointer",
            transition: "background-color 0.3s",
            height: "24px",
            width: "24px",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#7C3AED";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "#8B5CF6";
          }}
          title="Play Audio"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </div>

        {isHovering && !showPlayer && (
          <div
            onClick={togglePlayer}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: "4px",
              padding: "4px",
              backgroundColor: "#E5E7EB",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "background-color 0.3s",
              height: "24px",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#D1D5DB";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#E5E7EB";
            }}
          >
            <ArrowIcon />
          </div>
        )}
      </div>

      {showPlayer && (
        <div
          style={{
            width: "40vw",
            display: "flex",
            backgroundColor: "#FFFFFF",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <WaveSurferComponent url={url} isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
          <button
            onClick={togglePlayer}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "#374151";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "#6B7280";
            }}
            style={{
              color: "black",
              backgroundColor: "transparent",
              cursor: "pointer",
              padding: "4px",
              fontSize: "15px",
            }}
          >
            X
          </button>
        </div>
      )}
    </div>
  );
}

// Define the custom Lexical node
export class AudioButtonNode extends DecoratorNode<React.ReactElement> {
  __marker: AudioButtonMarker;
  __url: string;

  constructor(url: string, key?: NodeKey) {
    super(key);
    this.__marker = AUDIO_BUTTON_MARKER;
    this.__url = url;
  }

  static getType(): string {
    return "audio-button";
  }

  static clone(node: AudioButtonNode): AudioButtonNode {
    const { __url, __key } = node;
    return new AudioButtonNode(__url, __key);
  }

  static importJSON(serializedNode: SerializedAudioButtonNode): AudioButtonNode {
    const { url } = serializedNode;
    return $createAudioButtonNode(url).updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedAudioButtonNode>): this {
    const self = super.updateFromJSON(serializedNode);
    if (serializedNode.url) self.setURL(serializedNode.url);
    if (serializedNode.marker) self.setMarker(serializedNode.marker);
    return self;
  }

  setMarker(marker: AudioButtonMarker): this {
    if (this.__marker === marker) return this;

    const self = this.getWritable();
    self.__marker = marker;
    return self;
  }

  getMarker(): AudioButtonMarker {
    const self = this.getLatest();
    return self.__marker;
  }

  setURL(url: string): this {
    if (this.__url === url) return this;

    const self = this.getWritable();
    self.__url = url;
    return self;
  }

  getURL(): string {
    const self = this.getLatest();
    return self.__url;
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    span.setAttribute("data-marker", this.__marker);
    span.classList.add(AUDIO_BUTTON_CLASS_NAME, `usfm_${this.__marker}`);
    span.setAttribute("data-url", this.__url);
    span.style.display = "inline";
    return span;
  }

  updateDOM(): false {
    return false;
  }

  // Decorate method for rendering
  decorate(): React.ReactElement {
    return <AudioButtonComponent url={this.__url} nodeKey={this.__key} />;
  }

  // For serialization
  exportJSON(): SerializedAudioButtonNode {
    return {
      type: this.getType(),
      marker: this.getMarker(),
      url: this.getURL(),
      version: AUDIO_BUTTON_VERSION,
    };
  }

  // Make sure this node is treated as inline
  isInline(): boolean {
    return true;
  }
}

// Factory function to create a new node
export function $createAudioButtonNode(url: string): AudioButtonNode {
  return $applyNodeReplacement(new AudioButtonNode(url));
}

// Type checking helper
export function $isAudioButtonNode(node: LexicalNode | null | undefined): node is AudioButtonNode {
  return node instanceof AudioButtonNode;
}

// Serialized type check helper
export function isSerializedAudioButtonNode(
  node: SerializedLexicalNode | null | undefined,
): node is SerializedAudioButtonNode {
  return node?.type === AudioButtonNode.getType();
}
